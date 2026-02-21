/**
 * Filename Generator Utility
 * --------------------------
 * Generates output filenames following the convention:
 * {FirstName}_{meta_code}_YYMM_v{version}
 *
 * Example: JohnDoe_SWE_2602_v4
 */

/**
 * Generate the output filename for a PDF generation job.
 *
 * @param fullName - The user's full name from data.basics.name.full (e.g. "John Doe")
 * @param metaCode - The resume's meta.code (e.g. "SWE")
 * @param version  - The version number (e.g. 4)
 * @returns The formatted filename without extension (e.g. "JohnDoe_SWE_2602_v4")
 */
export function generateOutputFilename(
  fullName: string,
  metaCode: string,
  version: number
): string {
  // Clean the name: remove spaces, special chars, keep alphanumeric
  const cleanName = fullName
    .replace(/[^a-zA-Z\s]/g, '')
    .split(/\s+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');

  // Get YYMM from current date
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const datePart = `${yy}${mm}`;

  // Clean meta code
  const cleanMeta = metaCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  return `${cleanName}_${cleanMeta}_${datePart}_v${version}`;
}
