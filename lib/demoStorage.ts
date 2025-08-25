// Shared demo storage for bookmarks and votes
// Try to load from a file-based storage for persistence
import fs from 'fs'
import path from 'path'

const STORAGE_DIR = path.join(process.cwd(), 'data', 'demo')
const BOOKMARKS_FILE = path.join(STORAGE_DIR, 'bookmarks.json')
const VOTES_FILE = path.join(STORAGE_DIR, 'votes.json')

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true })
}

// Initialize from files if they exist
let demoBookmarks: any[] = []
let demoVotes: any[] = []

try {
  if (fs.existsSync(BOOKMARKS_FILE)) {
    demoBookmarks = JSON.parse(fs.readFileSync(BOOKMARKS_FILE, 'utf-8'))
  }
} catch (error) {
  console.error('Error loading bookmarks:', error)
}

try {
  if (fs.existsSync(VOTES_FILE)) {
    demoVotes = JSON.parse(fs.readFileSync(VOTES_FILE, 'utf-8'))
  }
} catch (error) {
  console.error('Error loading votes:', error)
}

// Load bookmarks from persistent storage
export function loadDemoBookmarks() {
  return demoBookmarks
}

// Save bookmarks to persistent storage
export function saveDemoBookmarks(bookmarks: any[]) {
  demoBookmarks = bookmarks
  try {
    fs.writeFileSync(BOOKMARKS_FILE, JSON.stringify(bookmarks, null, 2))
  } catch (error) {
    console.error('Error saving bookmarks:', error)
  }
}

// Load votes from persistent storage
export function loadDemoVotes() {
  return demoVotes
}

// Save votes to persistent storage
export function saveDemoVotes(votes: any[]) {
  demoVotes = votes
  try {
    fs.writeFileSync(VOTES_FILE, JSON.stringify(votes, null, 2))
  } catch (error) {
    console.error('Error saving votes:', error)
  }
}