const os = require('os');

/**
 * Optimierte PDF-Export-Queue mit Parallelisierung und Resource-Management
 */
class PDFExportQueue {
  constructor(options = {}) {
    // Konfigurierbare Limits
    this.maxConcurrentExports = options.maxConcurrentExports || 2; // 2-3 parallel je nach RAM
    this.maxQueueSize = options.maxQueueSize || 50;
    this.rateLimitPerUser = options.rateLimitPerUser || 3; // Max 3 Exports pro User gleichzeitig
    this.rateLimitWindow = options.rateLimitWindow || 60 * 1000; // 1 Minute
    
    // Queue Management
    this.queue = [];
    this.activeExports = new Map(); // exportId -> Promise
    this.userExportCounts = new Map(); // userId -> Anzahl aktiver Exports
    
    // Rate Limiting Tracking
    this.userRateLimits = new Map(); // userId -> { count: number, resetAt: timestamp }
    
    // Resource Monitoring
    this.monitoring = {
      totalProcessed: 0,
      totalFailed: 0,
      averageProcessingTime: 0,
      peakMemoryUsage: 0
    };
    
    // Starte Monitoring
    this.startMonitoring();
  }

  /**
   * Fügt einen Export zur Queue hinzu
   */
  async addExport(exportJob) {
    const { exportId, userId, priority = 0 } = exportJob;
    
    // Prüfe Queue-Größe
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('Export queue is full. Please try again later.');
    }
    
    // Rate Limiting prüfen
    if (!this.checkRateLimit(userId)) {
      throw new Error('Too many exports in progress. Please wait before starting a new export.');
    }
    
    // Prüfe ob User bereits zu viele aktive Exports hat
    const userActiveCount = this.userExportCounts.get(userId) || 0;
    if (userActiveCount >= this.rateLimitPerUser) {
      throw new Error(`Maximum ${this.rateLimitPerUser} concurrent exports per user allowed.`);
    }
    
    // Füge zur Queue hinzu (mit Priorität)
    const job = {
      ...exportJob,
      priority,
      addedAt: Date.now()
    };
    
    this.queue.push(job);
    this.queue.sort((a, b) => b.priority - a.priority); // Höhere Priorität zuerst
    
    // Starte Verarbeitung
    this.processQueue();
    
    return exportId;
  }

  /**
   * Prüft Rate-Limiting für einen User
   */
  checkRateLimit(userId) {
    const now = Date.now();
    const userLimit = this.userRateLimits.get(userId);
    
    if (!userLimit || now > userLimit.resetAt) {
      // Reset oder erstes Mal
      this.userRateLimits.set(userId, {
        count: 1,
        resetAt: now + this.rateLimitWindow
      });
      return true;
    }
    
    if (userLimit.count >= this.rateLimitPerUser) {
      return false;
    }
    
    userLimit.count++;
    return true;
  }

  /**
   * Verarbeitet die Queue mit Parallelisierung
   */
  async processQueue() {
    // Prüfe ob noch Platz für weitere Exports ist
    if (this.activeExports.size >= this.maxConcurrentExports) {
      return;
    }
    
    // Prüfe ob noch Jobs in der Queue sind
    if (this.queue.length === 0) {
      return;
    }
    
    // Starte so viele Jobs wie möglich parallel
    while (
      this.activeExports.size < this.maxConcurrentExports &&
      this.queue.length > 0
    ) {
      const job = this.queue.shift();
      this.startExport(job);
    }
  }

  /**
   * Startet einen einzelnen Export
   */
  async startExport(job) {
    const { exportId, userId, bookId, options, io, processor } = job;
    const startTime = Date.now();
    
    // Track aktiven Export
    this.activeExports.set(exportId, { startTime, userId });
    
    // Erhöhe User-Counter
    const userCount = this.userExportCounts.get(userId) || 0;
    this.userExportCounts.set(userId, userCount + 1);
    
    // Logging
    console.log(`[PDF Export Queue] Starting export ${exportId} for user ${userId} (${this.activeExports.size}/${this.maxConcurrentExports} active)`);
    
    // Erstelle Promise für den Export
    const exportPromise = (async () => {
      try {
        // Rufe den eigentlichen Export-Prozessor auf
        const result = await processor(job);
        
        const processingTime = Date.now() - startTime;
        this.monitoring.totalProcessed++;
        this.updateAverageProcessingTime(processingTime);
        
        console.log(`[PDF Export Queue] Export ${exportId} completed in ${processingTime}ms`);
        
        return result;
      } catch (error) {
        this.monitoring.totalFailed++;
        console.error(`[PDF Export Queue] Export ${exportId} failed:`, error.message);
        throw error;
      } finally {
        // Cleanup
        this.activeExports.delete(exportId);
        const userCount = this.userExportCounts.get(userId) || 0;
        if (userCount > 0) {
          this.userExportCounts.set(userId, userCount - 1);
        }
        
        // Starte nächste Jobs
        this.processQueue();
      }
    })();
    
    return exportPromise;
  }

  /**
   * Aktualisiert durchschnittliche Verarbeitungszeit
   */
  updateAverageProcessingTime(newTime) {
    const { totalProcessed, averageProcessingTime } = this.monitoring;
    this.monitoring.averageProcessingTime = 
      (averageProcessingTime * (totalProcessed - 1) + newTime) / totalProcessed;
  }

  /**
   * Startet Resource-Monitoring
   */
  startMonitoring() {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      
      if (heapUsedMB > this.monitoring.peakMemoryUsage) {
        this.monitoring.peakMemoryUsage = heapUsedMB;
      }
      
      // Log Status alle 5 Minuten
      const now = Date.now();
      if (!this.lastStatusLog || now - this.lastStatusLog > 5 * 60 * 1000) {
        this.lastStatusLog = now;
        console.log('[PDF Export Queue] Status:', {
          queueLength: this.queue.length,
          activeExports: this.activeExports.size,
          totalProcessed: this.monitoring.totalProcessed,
          totalFailed: this.monitoring.totalFailed,
          avgProcessingTime: Math.round(this.monitoring.averageProcessingTime),
          memoryUsageMB: Math.round(heapUsedMB),
          peakMemoryMB: Math.round(this.monitoring.peakMemoryUsage)
        });
      }
    }, 10000); // Alle 10 Sekunden prüfen
  }

  /**
   * Gibt Queue-Status zurück
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      activeExports: this.activeExports.size,
      maxConcurrent: this.maxConcurrentExports,
      monitoring: { ...this.monitoring }
    };
  }

  /**
   * Gibt aktive Exports zurück
   */
  getActiveExports() {
    const active = [];
    for (const [exportId, info] of this.activeExports.entries()) {
      active.push({
        exportId,
        userId: info.userId,
        runningTime: Date.now() - info.startTime
      });
    }
    return active;
  }

  /**
   * Prüft ob ein Export noch läuft
   */
  isExportActive(exportId) {
    return this.activeExports.has(exportId);
  }
}

module.exports = PDFExportQueue;


