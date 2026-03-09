const puppeteer = require('puppeteer');
const path = require('path');

/**
 * PDF Renderer Service für Puppeteer-basiertes Rendering
 * Verwaltet Browser-Instanz für wiederverwendbares Rendering mehrerer Pages
 */
class PDFRendererService {
  constructor() {
    this.browser = null;
    this.baseUrl = process.env.SERVER_URL || 'http://localhost:5000';
  }

  /**
   * Initialisiert Browser-Instanz (wiederverwendbar)
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.browser) {
      return; // Bereits initialisiert
    }

    // Konfiguration: Neuer Headless-Modus für besseres Rendering
    // Um auf alten Headless-Modus zurückzugehen: headless: true
    // Um Headful-Modus zu aktivieren: headless: false (benötigt Display-Server)
    const headlessMode = process.env.PDF_EXPORT_HEADFUL === 'true' 
      ? false 
      : (process.env.PDF_EXPORT_NEW_HEADLESS !== 'false' ? 'new' : true);

    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--font-render-hinting=none',
      '--force-color-profile=srgb'
    ];

    // GPU nur deaktivieren, wenn explizit gewünscht oder in alter Headless-Modus
    // Der neue Headless-Modus kann GPU-Beschleunigung nutzen (falls verfügbar)
    if (process.env.PDF_EXPORT_DISABLE_GPU === 'true' || headlessMode === true) {
      args.push('--disable-gpu');
    }

    this.browser = await puppeteer.launch({
      headless: headlessMode,
      args
    });
  }

  /**
   * Rendert eine einzelne Page zu PNG Buffer
   * @param {Object} pageData - Page-Daten mit page, book, canvasWidth, canvasHeight
   * @param {Object} options - Optionale Render-Optionen (scale, user, token)
   * @returns {Promise<Buffer>} - PNG image buffer
   */
  async renderPage(pageData, options = {}) {
    if (!this.browser) {
      await this.initialize();
    }

    const { page: pageObj, book, canvasWidth, canvasHeight } = pageData;
    const { scale = 1, user = null, token = null } = options;

    const page = await this.browser.newPage();

    try {
      // Set viewport size
      await page.setViewport({
        width: canvasWidth,
        height: canvasHeight,
        deviceScaleFactor: scale || 1
      });

      // Listen to console messages and errors for debugging
      const consoleMessages = [];
      page.on('console', msg => {
        const text = msg.text();
        consoleMessages.push(text);
        
        // Highlight DEBUG logs
        if (text.includes('[DEBUG')) {
          console.log('═══════════════════════════════════════════════════════');
          console.log('🔍 [DEBUG LOG]', text);
          console.log('═══════════════════════════════════════════════════════');
        } else {
          console.log('[Browser Console]', text);
        }
      });
      
      page.on('pageerror', error => {
        console.error('[Browser Error]', error.message);
        consoleMessages.push(`ERROR: ${error.message}`);
      });

      // Track completely failed requests (network errors, DNS failures)
      page.on('requestfailed', request => {
        console.error('[Browser Request Failed]', {
          url: request.url(),
          method: request.method(),
          failure: request.failure()?.errorText || 'Unknown'
        });
      });

      // Track HTTP error responses (404, 500, etc.)
      page.on('response', response => {
        if (response.status() >= 400) {
          console.error('[Browser HTTP Error]', {
            status: response.status(),
            statusText: response.statusText(),
            url: response.url(),
            method: response.request().method()
          });
        }
      });

      // Debug: Log page data
      console.log('[PDFRendererService] Rendering page:', {
        pageNumber: pageObj.pageNumber,
        elementsCount: pageObj.elements?.length || 0,
        hasBackground: !!pageObj.background,
        canvasSize: { width: canvasWidth, height: canvasHeight },
        scale: scale
      });
      page.on('response', resp => {
        const url = resp.url();
        if ((url.includes('fonts.googleapis') || url.includes('fonts.gstatic')) && resp.status() >= 400) {
          console.warn('[PDFRendererService] Font response error:', resp.status(), url);
        }
      });

      // Navigate to HTML template
      const templateUrl = `${this.baseUrl}/pdf-renderer.html`;
      console.log(`[PDFRendererService] Navigating to ${templateUrl}`);
      
      const response = await page.goto(templateUrl, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      if (!response) {
        throw new Error('Failed to load template: no response');
      }
      
      const status = response.status();
      // Accept 200 (OK) and 304 (Not Modified) as success
      if (status !== 200 && status !== 304) {
        throw new Error(`Failed to load template: ${status}`);
      }
      // After template is loaded, inject Google Fonts stylesheets (must be after navigation to persist)
      // Consolidated URLs to cover all families from font-families.ts that are Google Fonts
      const googleFontsUrls = [
        // Block 1
        'https://fonts.googleapis.com/css2?family=Amatic+SC:wght@400;700&family=Aguafina+Script&family=Arizonia&family=Astloch:wght@400;700&family=Audiowide&family=Ballet&family=Barrio&family=Bigelow+Rules&family=Bilbo+Swash+Caps&family=Bodoni+Moda:ital,wght@0,400;0,700;1,400&family=Bonheur+Royale&family=Bowlby+One+SC&family=Bungee&family=Bungee+Hairline&family=Bungee+Outline&family=Bungee+Shade&family=Caesar+Dressing&family=Calligraffitti&display=swap',
        // Block 2
        'https://fonts.googleapis.com/css2?family=Chewy&family=Cherish&family=Climate+Crisis&family=Comic+Neue:ital,wght@0,400;0,700;1,400&family=Corinthia:wght@400;700&family=Creepster&family=Delicious+Handrawn&family=Diplomata+SC&family=Doto:wght@400;700&family=Dr+Sugiyama&family=DynaPuff:wght@400;700&family=Electrolize&family=Emblema+One&family=Emilys+Candy&family=Fascinate&family=Give+You+Glory&family=Gloria+Hallelujah&family=Gochi+Hand&family=Grape+Nuts&display=swap',
        // Block 3 (includes Molle, Mynerve)
        'https://fonts.googleapis.com/css2?family=Henny+Penny&family=Homemade+Apple&family=Inclusive+Sans&family=Italiana&family=Julius+Sans+One&family=Kablammo&family=Knewave&family=Lacquer&family=Lobster&family=Luckiest+Guy&family=Meddon&family=Megrim&family=Miltonian&family=Mohave:wght@400;700&family=Molle:ital,wght@0,400;1,400&family=Monofett&family=Monsieur+La+Doulaise&family=Monoton&family=Mynerve&display=swap',
        // Block 4
        'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&family=Noto+Sans+Symbols:wght@400;700&family=Noto+Sans+Symbols+2:wght@400;700&family=Permanent+Marker&family=Playwrite+DE+VA&family=Poiret+One&family=Ribeye+Marrow&family=Rock+Salt&family=Rubik+Dirt&family=Rubik+Glitch&family=Rubik+Wet+Paint&family=Rye&family=Saira+Stencil+One&family=Schoolbell&family=Shadows+Into+Light+Two&display=swap',
        // Block 5 (includes Stalemate and other fonts)
        'https://fonts.googleapis.com/css2?family=Shojumaru&family=Sigmar+One&family=Silkscreen:wght@400;700&family=Stalemate&family=Sunflower:wght@400;700&family=Syne+Mono&family=Tourney:wght@400;700&family=Turret+Road:wght@400;700&family=UnifrakturCook:wght@400;700&family=Vast+Shadow&family=WindSong&family=Yarndings+12&family=Zeyada&display=swap'
      ];
      await Promise.all(googleFontsUrls.map(async (fontUrl) => {
        try {
          await page.addStyleTag({ url: fontUrl });
        } catch (error) {
          console.warn(`[PDFRendererService] Failed to load font stylesheet ${fontUrl}:`, error.message);
        }
      }));
      console.log('[PDFRendererService] Font stylesheets injected after template load');

      // CRITICAL: Load fonts BEFORE rendering to ensure accurate text measurement
      // This is essential for fonts with overhangs/swashes (e.g., Audiowide, Bilbo Swash Caps)
      // The layout calculation happens during rendering, so fonts must be loaded first
      await page.evaluate(async () => {
        const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // Wait for document.fonts.ready, cap at 5s
        await Promise.race([document.fonts.ready, timeout(5000)]);

        // Proactively load all relevant Google Font families (normal + bold + italic)
        const googleFamilies = [
          'Mynerve','Molle','Chewy','Grape Nuts','Gochi Hand','Lacquer','Amatic SC','Comic Neue','Schoolbell',
          'Playwrite DE VA','Inclusive Sans','Mohave','Luckiest Guy','DynaPuff','Bungee','Bungee Outline',
          'Bungee Shade','Bungee Hairline','Henny Penny','Kablammo','Knewave','Lobster','Rock Salt',
          'Gloria Hallelujah','Rye','Rubik Dirt','Rubik Glitch','Rubik Wet Paint','Poiret One','Emilys Candy',
          'Bigelow Rules','Vast Shadow','Noto Sans Symbols','Noto Color Emoji','Noto Sans Symbols 2',
          'Permanent Marker','Monoton','Megrim','Fascinate','Electrolize','Doto','Bodoni Moda','Italiana',
          'Saira Stencil One','Emblema One','Monofett','Shojumaru','Audiowide','Bilbo Swash Caps','Stalemate'
        ];

        // System fonts that need explicit loading for consistent PDF rendering
        const systemFamilies = [
          'Arial','Arial Narrow','Tahoma','Verdana','Impact','Century Gothic','Bauhaus 93','Berlin Sans',
          'Georgia','Consolas','Times New Roman','Garamond','Courier','Baskerville','Rockwell','Cambria'
        ];

        const uniqueFamilies = Array.from(new Set([...googleFamilies, ...systemFamilies]));
        const loadPromises = [];
        // Load fonts with multiple sizes to cover all possible font sizes used in the document
        const fontSizes = [16, 24, 32, 40, 48, 50, 60, 72, 96, 100, 125, 150];
        uniqueFamilies.forEach(name => {
          fontSizes.forEach(size => {
            loadPromises.push(document.fonts.load(`400 ${size}px "${name}"`).catch(() => {}));
            loadPromises.push(document.fonts.load(`700 ${size}px "${name}"`).catch(() => {}));
            loadPromises.push(document.fonts.load(`400 italic ${size}px "${name}"`).catch(() => {}));
            loadPromises.push(document.fonts.load(`700 italic ${size}px "${name}"`).catch(() => {}));
          });
        });

        const waitAll = Promise.all(Array.from(document.fonts).map(f => f.loaded.catch(() => {})));
        const waitCritical = Promise.all(loadPromises);
        await Promise.race([Promise.all([waitAll, waitCritical]), timeout(10000)]); // Increased timeout to 10s

        const finalFonts = Array.from(document.fonts).map(f => ({ family: f.family, status: f.status }));
        // console.log('[PDFRendererService] Fonts preloaded before rendering:', JSON.stringify(finalFonts.filter(f => f.status === 'loaded').slice(0, 20), null, 2));
      });

      // console.log('[PDFRendererService] Fonts preloaded before rendering');

      // Wait for script to load and execute
      await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          // Check if script already loaded
          if (window.pdfRendererScriptLoaded && typeof window.PDFRenderer !== 'undefined') {
            resolve();
            return;
          }

          // Check for script error
          if (window.pdfRendererScriptError) {
            reject(new Error(`Script failed to load: ${window.pdfRendererScriptError}`));
            return;
          }

          let checkCount = 0;
          const checkBundle = setInterval(() => {
            checkCount++;
            
            // Check for script error
            if (window.pdfRendererScriptError) {
              clearInterval(checkBundle);
              reject(new Error(`Script failed to load: ${window.pdfRendererScriptError}`));
              return;
            }
            
            // Check if script loaded and PDFRenderer is available
            if (window.pdfRendererScriptLoaded && typeof window.PDFRenderer !== 'undefined') {
              clearInterval(checkBundle);
              resolve();
              return;
            }
            
            if (checkCount > 100) {
              clearInterval(checkBundle);
              const debugInfo = {
                scriptLoaded: window.pdfRendererScriptLoaded,
                scriptError: window.pdfRendererScriptError,
                windowPDFRenderer: typeof window.PDFRenderer,
                windowPDFRendererValue: window.PDFRenderer ? Object.keys(window.PDFRenderer) : null,
                scriptTags: Array.from(document.querySelectorAll('script')).map(s => ({
                  src: s.src,
                  type: s.type,
                  loaded: s.readyState
                }))
              };
              reject(new Error(`PDFRenderer bundle failed to load after 10 seconds. Debug: ${JSON.stringify(debugInfo)}`));
            }
          }, 100);
        });
      }).catch(async (error) => {
        // Get more debug info on error
        const debugInfo = await page.evaluate(() => {
          return {
            scriptLoaded: window.pdfRendererScriptLoaded,
            scriptError: window.pdfRendererScriptError,
            windowPDFRenderer: typeof window.PDFRenderer,
            windowPDFRendererValue: window.PDFRenderer,
            windowKeys: Object.keys(window).filter(k => k.includes('PDF') || k.includes('React')),
            scriptTags: Array.from(document.querySelectorAll('script')).map(s => ({
              src: s.src,
              type: s.type,
              loaded: s.readyState
            })),
            documentReadyState: document.readyState
          };
        });
        console.error('[PDFRendererService] Bundle load error:', error.message);
        console.error('[PDFRendererService] Debug info:', JSON.stringify(debugInfo, null, 2));
        throw error;
      });

      // Verify PDFRendererApp is available
      const hasPDFRendererApp = await page.evaluate(() => {
        return typeof window.PDFRenderer !== 'undefined' && 
               typeof window.PDFRenderer.PDFRendererApp !== 'undefined';
      });

      if (!hasPDFRendererApp) {
        const debugInfo = await page.evaluate(() => {
          return {
            windowPDFRenderer: typeof window.PDFRenderer,
            windowPDFRendererKeys: window.PDFRenderer ? Object.keys(window.PDFRenderer) : null
          };
        });
        throw new Error(`PDFRendererApp not found. Debug: ${JSON.stringify(debugInfo)}`);
      }

      console.log('[PDFRendererService] Bundle loaded successfully');

      // Initialize React app with page data
      await page.evaluate((data) => {
        const { pageData, user, token } = data;
        
        // Check if React and ReactDOM are available (from bundle)
        if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
          throw new Error('React or ReactDOM not available. Make sure the bundle includes React.');
        }

        // Debug: Check ReactDOM version and available methods
        const reactDOMType = typeof ReactDOM;
        const hasCreateRoot = typeof ReactDOM.createRoot === 'function';
        const reactDOMKeys = Object.keys(ReactDOM || {});
        
        if (!hasCreateRoot) {
          console.error('ReactDOM.createRoot not available. ReactDOM type:', reactDOMType);
          console.error('ReactDOM keys:', reactDOMKeys);
          console.error('React version:', React.version);
          throw new Error(`ReactDOM.createRoot is not a function. ReactDOM type: ${reactDOMType}, available keys: ${reactDOMKeys.join(', ')}`);
        }

        const rootElement = document.getElementById('pdf-renderer-root');
        if (!rootElement) {
          throw new Error('pdf-renderer-root element not found');
        }

        // Clear any existing content
        rootElement.innerHTML = '';

        // Create root and render PDFRendererApp
        const root = ReactDOM.createRoot(rootElement);
        
        // Track rendering errors
        window.renderError = null;
        window.renderComplete = false;
        window.renderImageDataUrl = null;
        window.konvaStage = null; // Will be set by PDFRenderer component
        
        try {
          // Wrap in error boundary
          const AppComponent = window.PDFRenderer.PDFRendererApp;
          if (!AppComponent) {
            throw new Error('PDFRendererApp component not found in window.PDFRenderer');
          }
          
          root.render(
            React.createElement(AppComponent, {
              pageData: pageData,
              user: user,
              token: token,
              onRenderComplete: (imageDataUrl) => {
                window.renderComplete = true;
                window.renderImageDataUrl = imageDataUrl;
              }
            })
          );
          
          // Mark that rendering was initiated
          window.renderInitiated = true;
        } catch (error) {
          window.renderError = error.message || String(error);
          console.error('[PDFRendererService] Error rendering PDFRendererApp:', error);
          throw error;
        }
      }, {
        pageData: {
          page: pageObj,
          book: book,
          canvasWidth: canvasWidth,
          canvasHeight: canvasHeight,
          scale: scale
        },
        user: user,
        token: token
      });

      // Wait for React to mount and Konva stage to be created
      await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          let checkCount = 0;
          const checkComplete = setInterval(() => {
            checkCount++;
            
            // Check for React rendering errors first
            if (window.renderError) {
              clearInterval(checkComplete);
              console.error('[PDFRendererService] React rendering error:', window.renderError);
              reject(new Error(`React rendering error: ${window.renderError}`));
              return;
            }
            
            // Check if render was initiated
            if (!window.renderInitiated && checkCount > 10) {
              clearInterval(checkComplete);
              reject(new Error('React render was not initiated'));
              return;
            }
            
            const rootElement = document.getElementById('pdf-renderer-root');
            if (!rootElement) {
              if (checkCount > 100) {
                clearInterval(checkComplete);
                reject(new Error('pdf-renderer-root element not found after 10 seconds'));
              }
              return;
            }

            // Check if React has rendered something
            const hasContent = rootElement.children.length > 0 || rootElement.innerHTML.trim() !== '';
            
            // Debug logging every 10 attempts
            if (checkCount % 10 === 0) {
              console.log(`[PDFRendererService] Check ${checkCount}:`, {
                hasContent,
                rootChildren: rootElement.children.length,
                rootHTML: rootElement.innerHTML.substring(0, 200),
                renderInitiated: window.renderInitiated,
                renderError: window.renderError,
              });
            }
            
            // Try multiple methods to get the Konva Stage instance
            let stage = null;
            
            // Method 1: Try to get from window.konvaStage (set by PDFRenderer component)
            if (window.konvaStage && typeof window.konvaStage === 'object') {
              // Check if it's a valid Konva Stage by checking for getLayers method
              if (typeof window.konvaStage.getLayers === 'function') {
                stage = window.konvaStage;
              }
            }
            
            // Method 2: Try to get from canvas element (Konva stores stage reference here)
            if (!stage) {
              const canvas = document.querySelector('canvas');
              if (canvas) {
                // Konva stores the stage instance in canvas._konvaStage
                if (canvas._konvaStage && typeof canvas._konvaStage.getLayers === 'function') {
                  stage = canvas._konvaStage;
                }
                // Also check if Konva has stored it elsewhere
                if (!stage && canvas.konvaStage) {
                  const konvaStage = canvas.konvaStage;
                  if (typeof konvaStage.getLayers === 'function') {
                    stage = konvaStage;
                  }
                }
              }
            }
            
            // Method 3: Try to get from Konva content div
            if (!stage) {
              const konvaContent = document.querySelector('.konvajs-content');
              if (konvaContent) {
                // Check if stage is stored in the content div
                const contentStage = konvaContent.konvaStage || konvaContent._konvaStage;
                if (contentStage && typeof contentStage.getLayers === 'function') {
                  stage = contentStage;
                }
                // Also check parent element
                const parent = konvaContent.parentElement;
                if (!stage && parent) {
                  const parentStage = parent.konvaStage || parent._konvaStage;
                  if (parentStage && typeof parentStage.getLayers === 'function') {
                    stage = parentStage;
                  }
                }
              }
            }
            
            // If still no stage, check if Konva content div exists (Konva might still be initializing)
            if (!stage) {
              const konvaContent = document.querySelector('.konvajs-content');
              if (konvaContent && checkCount < 300) {
                // Konva content exists but stage not yet available - wait a bit more
                // Check if canvas exists but stage not set
                const canvas = konvaContent.querySelector('canvas');
                if (canvas && canvas._konvaStage) {
                  stage = canvas._konvaStage;
                }
                if (!stage) {
                  return; // Continue waiting
                }
              }
            }
            
            if (!stage) {
              if (checkCount > 300) {
                // Give more time - React might still be rendering or loading images
                clearInterval(checkComplete);
                const canvas = document.querySelector('canvas');
                const konvaContent = document.querySelector('.konvajs-content');
                const debugInfo = {
                  renderInitiated: window.renderInitiated || false,
                  rootElementExists: !!rootElement,
                  rootElementChildren: rootElement.children.length,
                  rootElementInnerHTML: rootElement.innerHTML.substring(0, 200),
                  windowKonvaStage: typeof window.konvaStage,
                  windowKonvaStageValue: window.konvaStage ? (window.konvaStage.getLayers ? 'valid stage' : 'invalid object') : 'null',
                  allCanvases: document.querySelectorAll('canvas').length,
                  konvaContentExists: !!konvaContent,
                  konvaContentHTML: konvaContent ? konvaContent.innerHTML.substring(0, 200) : null,
                  renderError: window.renderError || null,
                  allElements: Array.from(rootElement.querySelectorAll('*')).map(el => el.tagName).slice(0, 10),
                };
                reject(new Error(`Konva stage not found after 30 seconds. Debug: ${JSON.stringify(debugInfo)}`));
              }
              return;
            }

            // Store stage globally for screenshot (even if no layers yet)
            window.konvaStage = stage;

            // Check if stage has layers (React-Konva components need time to mount)
            const layers = stage.getLayers();
            
            // Debug logging for layer check
            if (checkCount % 10 === 0 && layers.length === 0) {
              console.log(`[PDFRendererService] Stage found but no layers yet (check ${checkCount}):`, {
                stageExists: true,
                layersCount: layers.length,
                stageWidth: stage.width(),
                stageHeight: stage.height(),
              });
            }
            
            if (layers.length === 0) {
              // Layers not yet mounted - wait a bit more
              if (checkCount > 300) {
                clearInterval(checkComplete);
                const rootElement = document.getElementById('pdf-renderer-root');
                const konvaContent = document.querySelector('.konvajs-content');
                const canvas = document.querySelector('canvas');
                const debugInfo = {
                  stageExists: true,
                  layersCount: 0,
                  rootElementExists: !!rootElement,
                  rootElementHTML: rootElement ? rootElement.innerHTML.substring(0, 500) : null,
                  konvaContentExists: !!konvaContent,
                  konvaContentHTML: konvaContent ? konvaContent.innerHTML.substring(0, 200) : null,
                  canvasExists: !!canvas,
                  canvasWidth: canvas ? canvas.width : null,
                  canvasHeight: canvas ? canvas.height : null,
                  renderError: window.renderError || null,
                  renderInitiated: window.renderInitiated || false,
                  reactError: window.reactError || null,
                };
                reject(new Error(`Stage has no layers after 30 seconds. React-Konva components may not have mounted. Debug: ${JSON.stringify(debugInfo)}`));
                return;
              }
              return; // Continue waiting
            }

            console.log(`[PDFRendererService] Stage ready with ${layers.length} layers`);
            
            // Wait a bit more for images/fonts to load and ensure rendering is complete
            setTimeout(() => {
              clearInterval(checkComplete);
              resolve();
            }, 1000);
          }, 100);
        });
      });

      // Wait for fonts to load completely (single pass, timeout-protected)
      await page.evaluate(async () => {
        const timeout = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // Wait for document.fonts.ready, cap at 5s
        await Promise.race([document.fonts.ready, timeout(5000)]);

        // Proaktiv alle relevanten Google-Familien laden (normal + italic)
        const googleFamilies = [
          'Mynerve','Molle','Chewy','Grape Nuts','Gochi Hand','Lacquer','Amatic SC','Comic Neue','Schoolbell',
          'Playwrite DE VA','Inclusive Sans','Mohave','Luckiest Guy','DynaPuff','Bungee','Bungee Outline',
          'Bungee Shade','Bungee Hairline','Henny Penny','Kablammo','Knewave','Lobster','Rock Salt',
          'Gloria Hallelujah','Rye','Rubik Dirt','Rubik Glitch','Rubik Wet Paint','Poiret One','Emilys Candy',
          'Bigelow Rules','Vast Shadow','Noto Sans Symbols','Noto Color Emoji','Noto Sans Symbols 2',
          'Permanent Marker','Monoton','Megrim','Fascinate','Electrolize','Doto','Bodoni Moda','Italiana',
          'Saira Stencil One','Emblema One','Monofett','Shojumaru'
        ];

        // System fonts that need explicit loading for consistent PDF rendering
        const systemFamilies = [
          'Arial','Arial Narrow','Tahoma','Verdana','Impact','Century Gothic','Bauhaus 93','Berlin Sans',
          'Georgia','Consolas','Times New Roman','Garamond','Courier','Baskerville','Rockwell','Cambria'
        ];

        const uniqueFamilies = Array.from(new Set([...googleFamilies, ...systemFamilies]));
        const loadPromises = [];
        uniqueFamilies.forEach(name => {
          loadPromises.push(document.fonts.load(`400 48px "${name}"`).catch(() => {}));
          loadPromises.push(document.fonts.load(`700 48px "${name}"`).catch(() => {}));
          loadPromises.push(document.fonts.load(`400 italic 48px "${name}"`).catch(() => {}));
          loadPromises.push(document.fonts.load(`700 italic 48px "${name}"`).catch(() => {}));
        });

        const waitAll = Promise.all(Array.from(document.fonts).map(f => f.loaded.catch(() => {})));
        const waitCritical = Promise.all(loadPromises);
        await Promise.race([Promise.all([waitAll, waitCritical]), timeout(5000)]);

        const finalFonts = Array.from(document.fonts).map(f => ({ family: f.family, status: f.status }));
        // console.log('[PDFRendererService] Fonts status after load attempt:', JSON.stringify(finalFonts.slice(0, 50), null, 2));
      });

      console.log('[PDFRendererService] Fonts loaded');

      // Additional wait for images and rendering to complete
      await page.waitForTimeout(1000);
      
      // Wait for all images in Konva stage to be loaded
      await page.evaluate(() => {
        return new Promise((resolve) => {
          const stage = window.konvaStage;
          if (!stage) {
            resolve();
            return;
          }
          
          // Collect all image nodes from Konva stage
          const imageNodes = [];
          const layers = stage.getLayers();
          layers.forEach(layer => {
            layer.find('Image').forEach(node => {
              const image = node.image();
              if (image && !image.complete) {
                imageNodes.push(image);
              }
            });
          });
          
          if (imageNodes.length === 0) {
            resolve();
            return;
          }
          
          // Wait for all images to load
          let loadedCount = 0;
          const checkComplete = () => {
            loadedCount = imageNodes.filter(img => img.complete).length;
            if (loadedCount === imageNodes.length) {
              resolve();
            }
          };
          
          imageNodes.forEach(img => {
            if (img.complete) {
              checkComplete();
            } else {
              img.onload = checkComplete;
              img.onerror = checkComplete; // Also resolve on error to avoid hanging
            }
          });
          
          // Timeout after 5 seconds
          setTimeout(() => {
            console.warn(`[PDFRendererService] Image loading timeout: ${loadedCount}/${imageNodes.length} images loaded`);
            resolve();
          }, 5000);
        });
      });

      console.log('[PDFRendererService] Images loaded');

      // Debug: Check stage content before screenshot
      const stageDebugInfo = await page.evaluate(() => {
        const stage = window.konvaStage;
        if (!stage) {
          return { error: 'Stage not found' };
        }
        
        const layers = stage.getLayers();
        const layerInfo = layers.map((layer, idx) => {
          const children = layer.getChildren();
          return {
            index: idx,
            childrenCount: children.length,
            childrenTypes: children.map(c => c.getType()).slice(0, 10),
            childrenDetails: children.slice(0, 5).map(c => ({
              type: c.getType(),
              x: c.x ? c.x() : null,
              y: c.y ? c.y() : null,
              width: c.width ? c.width() : null,
              height: c.height ? c.height() : null,
              visible: c.visible ? c.visible() : null,
            })),
            stageSize: { width: stage.width(), height: stage.height() },
            layerSize: { width: layer.width(), height: layer.height() }
          };
        });
        
        // Check React component state
        const rootElement = document.getElementById('pdf-renderer-root');
        const reactContent = rootElement ? {
          hasChildren: rootElement.children.length > 0,
          childrenCount: rootElement.children.length,
          innerHTMLLength: rootElement.innerHTML.length,
        } : null;
        
        return {
          stageExists: true,
          stageSize: { width: stage.width(), height: stage.height() },
          layerCount: layers.length,
          layers: layerInfo,
          canvasElement: document.querySelector('canvas') ? 'exists' : 'not found',
          reactContent: reactContent,
          renderInitiated: window.renderInitiated || false,
          renderError: window.renderError || null,
        };
      });
      
      // console.log('[PDFRendererService] Stage debug info:', JSON.stringify(stageDebugInfo, null, 2));

      // Derive completion from either explicit signal or concrete stage content.
      // This avoids brittle polling/fallback loops when callback timing is flaky.
      await page.waitForFunction(() => {
        if ((window.renderComplete === true)) {
          return true;
        }

        const stage = window.konvaStage;
        if (!stage || typeof stage.getLayers !== 'function') {
          return false;
        }

        const layers = stage.getLayers();
        if (!Array.isArray(layers) || layers.length === 0) {
          return false;
        }

        const hasContent = layers.some(layer => layer.getChildren().length > 0);
        if (!hasContent) {
          return false;
        }

        // Promote stage-ready state to renderComplete so downstream logs and flow stay consistent.
        window.renderComplete = true;
        if (!window.renderCompleteMeta) {
          window.renderCompleteMeta = {
            source: 'service-stage-detection',
            layersCount: layers.length,
            totalChildren: layers.reduce((sum, l) => sum + l.getChildren().length, 0),
            at: Date.now(),
          };
        }
        return true;
      }, { timeout: 12000, polling: 100 });

      const renderCompleteDebug = await page.evaluate(() => ({
        renderComplete: window.renderComplete === true,
        renderCompleteMeta: window.renderCompleteMeta || null,
        hasStage: !!window.konvaStage,
        stageLayers: window.konvaStage && typeof window.konvaStage.getLayers === 'function'
          ? window.konvaStage.getLayers().length
          : 0,
      }));
      console.log('[DEBUG PDFRendererService] ✅ RENDER COMPLETE - Proceeding to screenshot:', renderCompleteDebug);
      
      // Wait for layers to be mounted (React-Konva needs time to mount Layer components)
      await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          let attempts = 0;
          const checkLayers = setInterval(() => {
            attempts++;
            const stage = window.konvaStage;
            if (!stage) {
              if (attempts > 100) {
                clearInterval(checkLayers);
                reject(new Error('Stage not found after waiting for layers'));
              }
              return;
            }
            
            // Check if stage is valid
            if (typeof stage.getLayers !== 'function') {
              if (attempts > 100) {
                clearInterval(checkLayers);
                const debugInfo = {
                  stageType: typeof stage,
                  stageConstructor: stage.constructor?.name,
                  stageKeys: Object.keys(stage).slice(0, 20),
                  hasGetLayers: 'getLayers' in stage,
                  stageValue: String(stage).substring(0, 100)
                };
                reject(new Error(`Stage is not a valid Konva Stage. Debug: ${JSON.stringify(debugInfo)}`));
              }
              return;
            }
            
            const layers = stage.getLayers();
            
            // Debug info every 10 attempts
            if (attempts % 10 === 0) {
              const rootElement = document.getElementById('pdf-renderer-root');
              const konvaContent = document.querySelector('.konvajs-content');
              const canvas = document.querySelector('canvas');
              console.log(`[PDFRendererService] Waiting for layers (attempt ${attempts}):`, {
                layersCount: layers.length,
                rootElementExists: !!rootElement,
                konvaContentExists: !!konvaContent,
                canvasExists: !!canvas,
                renderError: window.renderError || null
              });
            }
            
            if (layers.length > 0) {
              clearInterval(checkLayers);
              resolve();
            } else if (attempts > 300) {
              clearInterval(checkLayers);
              const rootElement = document.getElementById('pdf-renderer-root');
              const konvaContent = document.querySelector('.konvajs-content');
              const canvas = document.querySelector('canvas');
              const debugInfo = {
                stageExists: true,
                layersCount: layers.length,
                rootElementExists: !!rootElement,
                rootElementHTML: rootElement ? rootElement.innerHTML.substring(0, 500) : null,
                konvaContentExists: !!konvaContent,
                konvaContentHTML: konvaContent ? konvaContent.innerHTML.substring(0, 200) : null,
                canvasExists: !!canvas,
                renderError: window.renderError || null,
                renderInitiated: window.renderInitiated || false
              };
              reject(new Error(`Stage has no layers after 30 seconds. React-Konva components may not have mounted. Debug: ${JSON.stringify(debugInfo)}`));
            }
          }, 100);
        });
      });

      // Get Konva stage and take screenshot
      const screenshot = await page.evaluate((width, height) => {
        const stage = window.konvaStage;
        if (!stage) {
          throw new Error('Konva stage not found in window.konvaStage');
        }

        const layers = stage.getLayers();
        if (layers.length === 0) {
          throw new Error('No layers found in stage');
        }
        
        // Check if any layer has children
        const hasContent = layers.some(layer => layer.getChildren().length > 0);
        if (!hasContent) {
          console.warn('[PDFRendererService] Stage has no content - layers exist but no children');
        }
        
        // Debug: Log detailed layer information for debugging
        console.log('[DEBUG PDFRendererService] ⚠️ TAKING SCREENSHOT - Detailed Layer Info:');
        layers.forEach((layer, idx) => {
          const children = layer.getChildren();
          console.log(`[DEBUG PDFRendererService] Layer ${idx}: ${children.length} children`);
          children.slice(0, 10).forEach((c, cIdx) => {
            const isGroup = c.getClassName() === 'Group';
            let childInfo = `  Child ${cIdx}: ${c.getClassName()} x=${c.x?c.x():null} y=${c.y?c.y():null} w=${c.width?c.width():null} h=${c.height?c.height():null} visible=${c.visible()} opacity=${c.opacity?c.opacity():null}`;
            if (isGroup) {
              const groupChildren = c.getChildren();
              childInfo += ` groupChildren=${groupChildren.length}`;
              groupChildren.slice(0, 3).forEach((gc, gcIdx) => {
                childInfo += ` [${gcIdx}:${gc.getClassName()} x=${gc.x?gc.x():0} y=${gc.y?gc.y():0} w=${gc.width?gc.width():0} h=${gc.height?gc.height():0}]`;
              });
            }
            console.log(childInfo);
          });
        });
        console.log('[DEBUG PDFRendererService] Total children across all layers:', 
          layers.reduce((sum, l) => sum + l.getChildren().length, 0));

        // Force redraw to ensure everything is rendered
        layers.forEach(layer => {
          layer.draw();
        });
        stage.draw();

        // Wait for rendering to complete and ensure all images are rendered
        return new Promise((resolve, reject) => {
          // Use requestAnimationFrame to ensure rendering is complete
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              try {
                // Force another draw to ensure everything is up to date
                layers.forEach(layer => {
                  layer.draw();
                });
                stage.draw();
                
                // Small delay to ensure all async rendering is complete
                setTimeout(() => {
                  try {
                    // Export stage to data URL
                    const dataURL = stage.toDataURL({
                      mimeType: 'image/png',
                      quality: 1.0,
                      pixelRatio: 1
                    });
                    
                    // Check if dataURL is valid (not empty)
                    if (!dataURL || dataURL === 'data:image/png;base64,') {
                      throw new Error('toDataURL returned empty or invalid data');
                    }
                    
                    resolve(dataURL);
                  } catch (error) {
                    console.error('[PDFRendererService] Error in toDataURL:', error);
                    reject(error);
                  }
                }, 200);
              } catch (error) {
                console.error('[PDFRendererService] Error during final draw:', error);
                reject(error);
              }
            });
          });
        });
      }, canvasWidth, canvasHeight);

      // Convert data URL to buffer
      const base64Data = screenshot.replace(/^data:image\/png;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      return buffer;
    } catch (error) {
      console.error('Error rendering page:', error);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Schließt Browser-Instanz
   * @returns {Promise<void>}
   */
  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = PDFRendererService;

