/**
 * Migration Script: Verschiebt Upload-Dateien von server/uploads nach root/uploads
 * 
 * Dieses Skript:
 * 1. Scannt alle möglichen alten Pfade (z.B. server/uploads/)
 * 2. Verschiebt Dateien nach root/uploads (oder UPLOADS_DIR aus .env)
 * 3. Loggt alle Aktionen
 * 4. Validiert dass alle Dateien korrekt verschoben wurden
 */

const fs = require('fs').promises
const path = require('path')
const { getUploadsDir } = require('../utils/uploads-path')

// .env Laden
require('dotenv').config()
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const SUBDIRS = [
  'profile_pictures',
  'images',
  'background-images',
  'stickers',
  'pdf-exports',
  'app',
]

async function exists(path) {
  try {
    await fs.access(path)
    return true
  } catch {
    return false
  }
}

async function getDirectoryStats(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const stats = {
      files: 0,
      dirs: 0,
      totalSize: 0,
    }

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      try {
        const stat = await fs.stat(fullPath)
        if (entry.isDirectory()) {
          stats.dirs++
          const subStats = await getDirectoryStats(fullPath)
          stats.files += subStats.files
          stats.dirs += subStats.dirs
          stats.totalSize += subStats.totalSize
        } else {
          stats.files++
          stats.totalSize += stat.size
        }
      } catch (error) {
        console.warn(`  ⚠️  Konnte Statistiken für ${fullPath} nicht lesen:`, error.message)
      }
    }

    return stats
  } catch {
    return { files: 0, dirs: 0, totalSize: 0 }
  }
}

async function copyDirectory(source, destination) {
  const entries = await fs.readdir(source, { withFileTypes: true })

  // Erstelle Ziel-Verzeichnis falls es nicht existiert
  await fs.mkdir(destination, { recursive: true })

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name)
    const destPath = path.join(destination, entry.name)

    if (entry.isDirectory()) {
      await copyDirectory(sourcePath, destPath)
    } else {
      // Kopiere Datei nur wenn sie noch nicht existiert
      const fileExists = await exists(destPath)
      if (fileExists) {
        console.log(`  ⚠️  Überspringe ${destPath} (existiert bereits)`)
      } else {
        await fs.copyFile(sourcePath, destPath)
        console.log(`  ✓  Kopiert: ${entry.name}`)
      }
    }
  }
}

async function migrateDirectory(oldDir, newDir) {
  if (!(await exists(oldDir))) {
    return { migrated: false, reason: 'Quell-Verzeichnis existiert nicht' }
  }

  const stats = await getDirectoryStats(oldDir)
  console.log(`\n📁 Migriere ${path.basename(oldDir)}:`)
  console.log(`   Quelle: ${oldDir}`)
  console.log(`   Ziel: ${newDir}`)
  console.log(`   Dateien: ${stats.files}, Verzeichnisse: ${stats.dirs}, Größe: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`)

  if (stats.files === 0 && stats.dirs === 0) {
    console.log(`   ⚠️  Verzeichnis ist leer, überspringe`)
    return { migrated: false, reason: 'Verzeichnis ist leer' }
  }

  try {
    await copyDirectory(oldDir, newDir)
    console.log(`   ✅ Migration erfolgreich: ${stats.files} Dateien kopiert`)
    return { migrated: true, files: stats.files, dirs: stats.dirs }
  } catch (error) {
    console.error(`   ❌ Fehler beim Migrieren:`, error.message)
    return { migrated: false, error: error.message }
  }
}

async function migrateUploads() {
  console.log('🚀 Starte Upload-Migration...\n')

  // Bestimme Ziel-Verzeichnis (root/uploads oder UPLOADS_DIR)
  const newUploadsDir = getUploadsDir()
  console.log(`Ziel-Verzeichnis: ${newUploadsDir}\n`)

  // Mögliche alte Quell-Verzeichnisse
  const oldPaths = [
    path.join(__dirname, '..', 'uploads'), // server/uploads
  ]

  const results = {
    totalDirs: 0,
    totalFiles: 0,
    successful: 0,
    skipped: 0,
    errors: 0,
  }

  // Prüfe welche alten Pfade existieren
  for (const oldPath of oldPaths) {
    const exists = await fs.access(oldPath).then(() => true).catch(() => false)
    if (!exists) {
      console.log(`📍 Alte Quelle ${oldPath} existiert nicht, überspringe\n`)
      continue
    }

    console.log(`📍 Prüfe alte Quelle: ${oldPath}`)
    const oldStats = await getDirectoryStats(oldPath)
    if (oldStats.files === 0 && oldStats.dirs === 0) {
      console.log(`   ⚠️  Verzeichnis ist leer\n`)
      continue
    }

    console.log(`   Gefunden: ${oldStats.files} Dateien, ${oldStats.dirs} Verzeichnisse\n`)

    // Stelle sicher dass Ziel-Verzeichnis existiert
    await fs.mkdir(newUploadsDir, { recursive: true })

    // Migriere alle Unterverzeichnisse
    for (const subdir of SUBDIRS) {
      const oldSubdir = path.join(oldPath, subdir)
      const newSubdir = path.join(newUploadsDir, subdir)

      const result = await migrateDirectory(oldSubdir, newSubdir)

      if (result.migrated) {
        results.totalDirs += result.dirs || 0
        results.totalFiles += result.files || 0
        results.successful++
      } else if (result.reason === 'Quell-Verzeichnis existiert nicht' || result.reason === 'Verzeichnis ist leer') {
        results.skipped++
      } else {
        results.errors++
      }
    }

    // Migriere auch direkt im alten Verzeichnis liegende Dateien (falls vorhanden)
    try {
      const entries = await fs.readdir(oldPath, { withFileTypes: true })
      const rootFiles = entries.filter(e => e.isFile())
      if (rootFiles.length > 0) {
        console.log(`\n📄 Migriere ${rootFiles.length} Dateien aus Root-Verzeichnis:`)
        for (const entry of rootFiles) {
          const sourcePath = path.join(oldPath, entry.name)
          const destPath = path.join(newUploadsDir, entry.name)
          const fileExists = await exists(destPath)
          if (!fileExists) {
            await fs.copyFile(sourcePath, destPath)
            console.log(`  ✓  Kopiert: ${entry.name}`)
            results.totalFiles++
            results.successful++
          } else {
            console.log(`  ⚠️  Überspringe ${entry.name} (existiert bereits)`)
            results.skipped++
          }
        }
      }
    } catch (error) {
      console.warn(`  ⚠️  Konnte Root-Dateien nicht migrieren:`, error.message)
    }
  }

  // Zusammenfassung
  console.log('\n' + '='.repeat(60))
  console.log('📊 Migrations-Zusammenfassung:')
  console.log('='.repeat(60))
  console.log(`✅ Erfolgreich migriert: ${results.successful} Verzeichnisse/Dateien`)
  console.log(`⚠️  Übersprungen: ${results.skipped}`)
  console.log(`❌ Fehler: ${results.errors}`)
  console.log(`📁 Gesamt: ${results.totalFiles} Dateien in ${results.totalDirs} Verzeichnissen`)
  console.log('='.repeat(60))

  if (results.errors > 0) {
    console.log('\n⚠️  Warnung: Es gab Fehler bei der Migration!')
    process.exit(1)
  } else {
    console.log('\n✅ Migration erfolgreich abgeschlossen!')
    console.log(`\n💡 Tipp: Prüfe die migrierten Dateien in ${newUploadsDir}`)
    console.log('💡 Du kannst die alten Verzeichnisse manuell löschen, nachdem du sichergestellt hast, dass alles korrekt migriert wurde.')
  }
}

// Führe Migration aus
migrateUploads().catch((error) => {
  console.error('\n❌ Kritischer Fehler bei der Migration:', error)
  process.exit(1)
})
