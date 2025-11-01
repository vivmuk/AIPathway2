import fs from 'fs';
import path from 'path';
import { Course, CourseGenerationStatus } from '@/types/course';

const STORAGE_FILE = path.join(process.cwd(), '.dev-storage.json');

interface DevStorage {
  courses: { [key: string]: Course };
  statuses: { [key: string]: CourseGenerationStatus };
}

let cachedStorage: DevStorage | null = null;
let lastFileModTime: number = 0;

function readStorage(forceReload = false): DevStorage {
  // Check if file was modified (for multi-process scenarios)
  let currentFileModTime = 0;
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const stats = fs.statSync(STORAGE_FILE);
      currentFileModTime = stats.mtimeMs;
      
      // If cache exists and file hasn't changed, return cache
      if (cachedStorage && !forceReload && currentFileModTime === lastFileModTime) {
        return cachedStorage as DevStorage;
      }
      
      lastFileModTime = currentFileModTime;
    } else if (cachedStorage && !forceReload) {
      // File doesn't exist but we have cache - return it
      return cachedStorage as DevStorage;
    }
  } catch (error) {
    // If stat fails, try to read anyway
  }
  
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const data = fs.readFileSync(STORAGE_FILE, 'utf8');
      const parsed: any = JSON.parse(data);
      // Convert date strings back to Date objects
      if (parsed.courses) {
        Object.values(parsed.courses).forEach((course: any) => {
          if (course.createdAt) course.createdAt = new Date(course.createdAt);
          if (course.metadata?.createdAt) course.metadata.createdAt = new Date(course.metadata.createdAt);
          if (course.metadata?.lastModified) course.metadata.lastModified = new Date(course.metadata.lastModified);
        });
      }
      // Ensure parsed data matches DevStorage structure
      const storage: DevStorage = {
        courses: parsed.courses || {},
        statuses: parsed.statuses || {},
      };
      cachedStorage = storage;
      if (currentFileModTime > 0) {
        lastFileModTime = currentFileModTime;
      }
      return storage;
    }
  } catch (error) {
    console.error(`[DevStorage] Error reading storage file:`, error);
  }
  const emptyStorage: DevStorage = { courses: {}, statuses: {} };
  cachedStorage = emptyStorage;
  lastFileModTime = 0;
  return emptyStorage;
}

function writeStorage(storage: DevStorage) {
  try {
    // Write to a temporary file first, then rename (atomic operation)
    const tempFile = STORAGE_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(storage, null, 2), 'utf8');
    fs.renameSync(tempFile, STORAGE_FILE);
    cachedStorage = storage;
    
    // Update last modification time
    if (fs.existsSync(STORAGE_FILE)) {
      const stats = fs.statSync(STORAGE_FILE);
      lastFileModTime = stats.mtimeMs;
    }
  } catch (error) {
    console.error(`[DevStorage] ❌ ERROR writing storage file:`, error);
    if (error instanceof Error) {
      console.error(`[DevStorage] Error details:`, error.message, error.stack);
    }
    throw error; // Re-throw so caller knows write failed
  }
}

export const devStorage = {
  getCourse: (id: string, forceReload = false): Course | undefined => {
    const storage = readStorage(forceReload);
    return storage.courses[id];
  },
  
  setCourse: (id: string, course: Course) => {
    try {
      const storage = readStorage(true); // Force reload to get latest
      storage.courses[id] = course;
      writeStorage(storage);
      console.log(`[DevStorage] ✅ Saved course ${id} (total: ${Object.keys(storage.courses).length})`);
    } catch (error) {
      console.error(`[DevStorage] ❌ Failed to save course ${id}:`, error);
      throw error;
    }
  },
  
  getStatus: (id: string, forceReload = false): CourseGenerationStatus | undefined => {
    const storage = readStorage(forceReload);
    return storage.statuses[id];
  },
  
  setStatus: (id: string, status: CourseGenerationStatus) => {
    try {
      const storage = readStorage(true); // Force reload to get latest
      storage.statuses[id] = status;
      writeStorage(storage);
    } catch (error) {
      console.error(`[DevStorage] ❌ Failed to save status ${id}:`, error);
      throw error;
    }
  },
  
  getAllCourses: (): Course[] => {
    const storage = readStorage();
    return Object.values(storage.courses);
  },
  
  deleteCourse: (id: string) => {
    const storage = readStorage();
    delete storage.courses[id];
    delete storage.statuses[id];
    writeStorage(storage);
  },
  
  // Get storage stats for debugging
  getStats: () => {
    const storage = readStorage();
    return {
      courseCount: Object.keys(storage.courses).length,
      statusCount: Object.keys(storage.statuses).length,
    };
  }
};

