# LLM Context for Engine Service Integration

> **Purpose**: This document provides all the context an LLM needs to update the Python resume engine to consume generation jobs from the MongoDB `generations` collection via CDC (Change Data Capture / Change Streams).

---

## Architecture Overview

```
┌──────────────────┐       CDC / Change Streams       ┌──────────────────┐
│  Next.js Web App │  ──────────────────────────────▶  │  Python Engine   │
│  (ResumeBuilder) │     watches `generations`         │  (LaTeX Worker)  │
└──────────────────┘     for status: "PENDING"         └──────────────────┘
        │                                                       │
        │ POST /api/generate                                    │
        │ → creates Generation doc                              │
        │   with status: "PENDING"                              │
        │   and full resume_data snapshot                        │
        │                                                       │
        │                                                       ▼
        │                                              ┌──────────────────┐
        │                                              │   1. Read job    │
        │                                              │   2. Extract     │
        │                                              │      resume_data │
        │                                              │   3. Merge with  │
        │                                              │      LaTeX tpl   │
        │                                              │   4. Compile PDF │
        │                                              │   5. Update job  │
        │                                              │      status      │
        │                                              └──────────────────┘
        │                                                       │
        ◀───────────────────────────────────────────────────────┘
           Engine updates status to COMPLETED/FAILED
           + sets pdf_path and/or drive_link
```

---

## MongoDB Connection

The web app and engine share the same MongoDB instance.

```
MONGODB_URI=mongodb://localhost:27017/resume_builder
```

---

## Generation Document Schema

**Collection**: `generations`

When the user clicks "Generate PDF" in the web app, a new document is inserted:

```jsonc
{
  "_id": ObjectId("..."),
  "resume_id": ObjectId("..."),          // Reference to the resumes collection
  "version_number": 4,                   // Which version this generation is for
  "status": "PENDING",                   // "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
  "output_filename": "JohnDoe_SWE_2602_v4",  // The naming convention (no extension)
  "resume_data": {                       // <<< FULL resume JSON snapshot
    "meta": { "code": "SWE", ... },
    "basics": {
      "name": { "full": "John Doe" },
      "contact": { "email": "john@example.com", ... },
      "summary": "...",
      "profiles": { ... }
    },
    "work": [ ... ],
    "education": [ ... ],
    "skills": [ ... ],
    "projects": [ ... ]
  },
  "meta_code": "SWE",                    // Denormalized for convenience
  "drive_link": null,                    // Engine sets this after Drive upload
  "pdf_path": null,                      // Engine sets this after compilation
  "error_log": null,                     // Engine sets this on failure
  "createdAt": "2026-02-22T03:45:00Z",
  "updatedAt": "2026-02-22T03:45:00Z"
}
```

---

## Output Filename Convention

```
{FirstName}{LastName}_{MetaCode}_{YYMM}_v{VersionNumber}
```

**Examples**:
| Full Name | Meta Code | Date | Version | Filename |
|-----------|-----------|------|---------|----------|
| John Doe | SWE | Feb 2026 | v4 | `JohnDoe_SWE_2602_v4` |
| Jane Smith | DS | Mar 2026 | v1 | `JaneSmith_DS_2603_v1` |
| Aryan W | BACKEND | Feb 2026 | v2 | `AryanW_BACKEND_2602_v2` |

The generated PDF should be saved as `{output_filename}.pdf`.

---

## Engine Workflow (What the engine needs to do)

### Step 1: Watch for new jobs

Using MongoDB Change Streams (CDC):

```python
import pymongo
from bson import ObjectId

client = pymongo.MongoClient("mongodb://localhost:27017")
db = client["resume_builder"]

# Watch for new PENDING generation documents
pipeline = [
    {"$match": {"operationType": "insert"}},
    {"$match": {"fullDocument.status": "PENDING"}}
]

with db.generations.watch(pipeline) as stream:
    for change in stream:
        job = change["fullDocument"]
        process_job(job)
```

**Alternative (polling)**:
```python
while True:
    job = db.generations.find_one_and_update(
        {"status": "PENDING"},
        {"$set": {"status": "PROCESSING", "updatedAt": datetime.utcnow()}},
        sort=[("createdAt", 1)]  # FIFO
    )
    if job:
        process_job(job)
    else:
        time.sleep(2)
```

### Step 2: Process the job

```python
def process_job(job):
    job_id = job["_id"]
    resume_data = job["resume_data"]        # Full resume JSON - no extra API call needed
    output_filename = job["output_filename"]  # e.g. "JohnDoe_SWE_2602_v4"
    
    try:
        # Mark as PROCESSING
        db.generations.update_one(
            {"_id": job_id},
            {"$set": {"status": "PROCESSING"}}
        )
        
        # 1. Merge resume_data with LaTeX template
        tex_content = merge_with_template(resume_data)
        
        # 2. Compile LaTeX → PDF
        pdf_path = compile_latex(tex_content, output_filename)
        # Expected pdf_path: f"/output/{output_filename}.pdf"
        
        # 3. (Optional) Upload to Google Drive
        drive_link = upload_to_drive(pdf_path)  # or None
        
        # 4. Mark as COMPLETED
        db.generations.update_one(
            {"_id": job_id},
            {"$set": {
                "status": "COMPLETED",
                "pdf_path": pdf_path,
                "drive_link": drive_link,
            }}
        )
        
    except Exception as e:
        db.generations.update_one(
            {"_id": job_id},
            {"$set": {
                "status": "FAILED",
                "error_log": str(e),
            }}
        )
```

### Step 3: Status transitions

```
PENDING  →  PROCESSING  →  COMPLETED
                         →  FAILED
```

The web app polls `GET /api/generations/{job_id}` every 3 seconds and updates the UI automatically.

---

## Resume Data Structure Reference

The `resume_data` field in the generation document follows this structure:

```jsonc
{
  "meta": {
    "code": "SWE",           // Profile identifier (SWE, DS, PM, etc.)
    "template": "default"    // LaTeX template to use (future use)
  },
  "basics": {
    "name": { "full": "John Doe" },
    "contact": {
      "email": "john@example.com",
      "phone": { "display": "+1 555-0100" }
    },
    "summary": "Experienced software engineer...",
    "profiles": {
      "linkedin": { "url": "https://linkedin.com/in/johndoe" },
      "github": { "url": "https://github.com/johndoe" }
    }
  },
  "work": [
    {
      "company": "Tech Corp",
      "position": "Senior Engineer",
      "start_date": "2022-01",
      "end_date": "Present",
      "highlights": ["Led team of 5...", "Improved CI/CD..."]
    }
  ],
  "education": [
    {
      "institution": "MIT",
      "degree": "B.S. Computer Science",
      "graduation_date": "2020-05",
      "gpa": "3.8"
    }
  ],
  "skills": [
    {
      "category": "Languages",
      "keywords": ["Python", "TypeScript", "Go"]
    }
  ],
  "projects": [
    {
      "name": "Open Source Tool",
      "description": "A CLI tool for...",
      "url": "https://github.com/...",
      "highlights": ["10k+ downloads"]
    }
  ]
}
```

---

## Summary of Fields the Engine Should Update

| Field | When | Value |
|-------|------|-------|
| `status` | On pickup | `"PROCESSING"` |
| `status` | On success | `"COMPLETED"` |
| `status` | On error | `"FAILED"` |
| `pdf_path` | On success | Path to PDF, e.g. `/output/JohnDoe_SWE_2602_v4.pdf` |
| `drive_link` | After Drive upload | Google Drive share URL |
| `error_log` | On error | Error message string |

---

## Indexes (already created by migration 001)

```
generations: { resume_id: 1, createdAt: -1 }
generations: { status: 1, createdAt: 1 }    // For engine polling
```

---

## Key Notes

1. **No API calls needed**: The engine does NOT need to call the web app's API. Everything it needs (`resume_data`, `output_filename`, `meta_code`) is in the generation document itself.

2. **Atomic pickup**: Use `find_one_and_update` with `status: "PENDING"` → `status: "PROCESSING"` to prevent multiple workers from picking up the same job.

3. **The web app polls**: After creating a job, the web app redirects to `/preview/{job_id}` and polls `GET /api/generations/{job_id}` every 3 seconds until the status changes.

4. **Filename is pre-computed**: The `output_filename` field already has the correct filename. The engine just needs to append `.pdf` and use it for the output file.
