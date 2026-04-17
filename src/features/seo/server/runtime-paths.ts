import path from "path";

function readDataRoot() {
  const configured = process.env.SEO_DATA_DIR?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  return path.join(process.cwd(), ".data");
}

export function getDataRootDirectory() {
  return readDataRoot();
}

export function getDataPath(...parts: string[]) {
  return path.join(readDataRoot(), ...parts);
}
