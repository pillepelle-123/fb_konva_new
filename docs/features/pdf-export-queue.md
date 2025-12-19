# PDF Export Queue - Optimierte Verarbeitung

## Übersicht

Die PDF-Export-Queue wurde optimiert, um mehrere Exports parallel zu verarbeiten und Ressourcen besser zu verwalten. Dies verbessert die Performance erheblich, besonders bei hoher Last.

## Features

### 1. Parallele Verarbeitung
- **Vorher**: Exports wurden sequenziell verarbeitet (einer nach dem anderen)
- **Jetzt**: 2-3 Exports können gleichzeitig verarbeitet werden (konfigurierbar)

### 2. Rate Limiting
- Maximal 3 gleichzeitige Exports pro User
- Verhindert, dass einzelne User die Queue überlasten

### 3. Priorisierung
- Book-Owner erhalten höhere Priorität (10 vs. 5)
- Kann später für Premium-User erweitert werden

### 4. Resource Monitoring
- Automatisches Tracking von:
  - Verarbeitungszeit
  - Memory-Verbrauch
  - Erfolgs-/Fehlerrate
  - Queue-Länge

### 5. Besseres Error Handling
- Spezifische Fehlermeldungen für verschiedene Szenarien
- Automatische Status-Updates in der Datenbank

## Konfiguration

### Environment-Variablen

Füge zu deiner `.env` Datei hinzu:

```bash
# PDF Export Queue Configuration
MAX_CONCURRENT_PDF_EXPORTS=2  # 2-3 je nach verfügbarem RAM (16GB = 2-3)
```

### Empfohlene Werte

| Server RAM | MAX_CONCURRENT_PDF_EXPORTS | Begründung |
|------------|----------------------------|------------|
| 8 GB       | 1-2                        | Begrenzt durch Puppeteer RAM-Verbrauch |
| 16 GB      | 2-3                        | Optimal für deinen V-Server |
| 32 GB+     | 3-4                        | Mehr parallel möglich |

## API-Endpunkte

### PDF Export erstellen

```http
POST /api/pdf-exports
Authorization: Bearer <token>
Content-Type: application/json

{
  "bookId": 123,
  "quality": "medium",
  "pageRange": "all",
  "startPage": null,
  "endPage": null,
  "currentPageIndex": null
}
```

**Response:**
```json
{
  "id": 456,
  "bookId": 123,
  "status": "pending",
  "createdAt": "2024-01-01T12:00:00Z",
  "queuePosition": 2,
  "estimatedWaitTime": 60
}
```

### Queue-Status abrufen

```http
GET /api/pdf-exports/queue/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "queueLength": 5,
  "activeExports": 2,
  "maxConcurrent": 2,
  "monitoring": {
    "totalProcessed": 150,
    "totalFailed": 3,
    "averageProcessingTime": 35000,
    "peakMemoryUsage": 2048
  },
  "activeExports": [
    {
      "exportId": 456,
      "userId": 789,
      "runningTime": 15000
    }
  ]
}
```

## Fehlerbehandlung

### Queue voll (503)
```json
{
  "error": "Export queue is full. Please try again later."
}
```

### Zu viele Exports (429)
```json
{
  "error": "Maximum 3 concurrent exports per user allowed."
}
```

### Rate Limit überschritten (429)
```json
{
  "error": "Too many exports in progress. Please wait before starting a new export."
}
```

## Monitoring

Die Queue loggt automatisch alle 5 Minuten Status-Informationen:

```
[PDF Export Queue] Status: {
  queueLength: 5,
  activeExports: 2,
  totalProcessed: 150,
  totalFailed: 3,
  avgProcessingTime: 35000,
  memoryUsageMB: 1024,
  peakMemoryMB: 2048
}
```

## Performance-Verbesserungen

### Vorher (Sequenziell)
- 1 Export nach dem anderen
- ~30-60 Sekunden pro Export
- Bei 10 Exports: 5-10 Minuten Gesamtzeit

### Nachher (Parallel)
- 2-3 Exports gleichzeitig
- ~30-60 Sekunden pro Export
- Bei 10 Exports: ~2-3 Minuten Gesamtzeit

**Ergebnis: 2-3x schnellerer Durchsatz**

## Technische Details

### Queue-Architektur

```
┌─────────────┐
│   Queue     │ (Priorisiert, FIFO)
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Active Exports  │ (Max 2-3 parallel)
│  ┌───────────┐  │
│  │ Export 1  │  │
│  └───────────┘  │
│  ┌───────────┐  │
│  │ Export 2  │  │
│  └───────────┘  │
└─────────────────┘
```

### Rate Limiting Mechanismus

- Pro User: Max 3 gleichzeitige Exports
- Zeitfenster: 1 Minute
- Automatisches Reset nach Zeitfenster

### Resource Management

- **Memory**: Automatisches Monitoring, Peak-Tracking
- **CPU**: Parallele Verarbeitung nutzt alle verfügbaren Cores
- **Cleanup**: Automatisches Cleanup nach jedem Export

## Best Practices

1. **Konfiguration anpassen**: Passe `MAX_CONCURRENT_PDF_EXPORTS` an deine Server-Ressourcen an
2. **Monitoring**: Überwache die Queue-Status-Logs regelmäßig
3. **Error Handling**: Implementiere Retry-Logik im Frontend für fehlgeschlagene Exports
4. **User-Feedback**: Zeige `queuePosition` und `estimatedWaitTime` im UI an

## Zukünftige Erweiterungen

- [ ] Premium-User Priorisierung
- [ ] Dynamische Anpassung der Concurrent-Limits basierend auf Memory
- [ ] Persistente Queue (Redis) für Multi-Server-Setup
- [ ] Webhook-Notifications für Export-Completion
- [ ] Export-Cancellation während Verarbeitung








