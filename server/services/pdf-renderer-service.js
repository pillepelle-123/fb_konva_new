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

    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
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

      // Debug: Log page data
      console.log('[PDFRendererService] Rendering page:', {
        pageNumber: pageObj.pageNumber,
        elementsCount: pageObj.elements?.length || 0,
        hasBackground: !!pageObj.background,
        canvasSize: { width: canvasWidth, height: canvasHeight },
        scale: scale
      });

      // Load fonts before navigating to template
      // Add Google Fonts stylesheets
      const googleFontsUrls = [
        'https://fonts.googleapis.com/css2?family=Amatic+SC:wght@400;700&family=Aguafina+Script&family=Arizonia&family=Astloch:wght@400;700&family=Audiowide&family=Ballet&family=Barrio&family=Bigelow+Rules&family=Bilbo+Swash+Caps&family=Bodoni+Moda:ital,wght@0,400;0,700;1,400&family=Bonheur+Royale&family=Bowlby+One+SC&family=Bungee&family=Bungee+Hairline&family=Bungee+Outline&family=Bungee+Shade&family=Caesar+Dressing&family=Calligraffitti&display=swap',
        'https://fonts.googleapis.com/css2?family=Chewy&family=Cherish&family=Climate+Crisis&family=Comic+Neue:ital,wght@0,400;0,700;1,400&family=Corinthia:wght@400;700&family=Creepster&family=Delicious+Handrawn&family=Diplomata+SC&family=Doto:wght@400;700&family=Dr+Sugiyama&family=DynaPuff:wght@400;700&family=Electrolize&family=Emblema+One&family=Emilys+Candy&family=Fascinate&family=Give+You+Glory&family=Gloria+Hallelujah&family=Gochi+Hand&family=Grape+Nuts&display=swap',
        'https://fonts.googleapis.com/css2?family=Henny+Penny&family=Homemade+Apple&family=Inclusive+Sans&family=Italiana&family=Julius+Sans+One&family=Kablammo&family=Knewave&family=Lacquer&family=Lobster&family=Luckiest+Guy&family=Meddon&family=Megrim&family=Miltonian&family=Mohave:wght@400;700&family=Molle:ital@1&family=Monofett&family=Monsieur+La+Doulaise&family=Monoton&family=Mynerve&display=swap',
        'https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&family=Noto+Sans+Symbols:wght@400;700&family=Noto+Sans+Symbols+2:wght@400;700&family=Permanent+Marker&family=Playwrite+DE+VA&family=Poiret+One&family=Ribeye+Marrow&family=Rock+Salt&family=Rubik+Dirt&family=Rubik+Glitch&family=Rubik+Wet+Paint&family=Rye&family=Saira+Stencil+One&family=Schoolbell&family=Shadows+Into+Light+Two&display=swap'
      ];
      
      // Load fonts in parallel
      await Promise.all(googleFontsUrls.map(async (fontUrl) => {
        try {
          await page.addStyleTag({ url: fontUrl });
        } catch (error) {
          console.warn(`[PDFRendererService] Failed to load font stylesheet ${fontUrl}:`, error.message);
        }
      }));
      
      console.log('[PDFRendererService] Font stylesheets loaded');

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

        window.renderComplete = false;
        window.renderImageDataUrl = null;
        window.konvaStage = null; // Will be set by PDFRenderer component
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

      // Wait for fonts to load completely
      await page.evaluate(async () => {
        // Wait for document.fonts.ready
        await document.fonts.ready;
        
        // Also wait for all font faces to be loaded
        const fontFaces = Array.from(document.fonts);
        await Promise.all(fontFaces.map(font => font.loaded.catch(() => {
          // Ignore errors for fonts that fail to load
        })));
        
        // Additional check: ensure fonts are actually loaded
        // Also check for specific fonts that might need more time
        return new Promise(async (resolve) => {
          // First, wait for Mynerve fonts specifically
          const mynerveFonts = Array.from(document.fonts).filter(font => 
            font.family.toLowerCase().includes('mynerve')
          );
          
          if (mynerveFonts.length > 0) {
            console.log(`[PDFRendererService] Found ${mynerveFonts.length} Mynerve font(s):`, 
              mynerveFonts.map(f => ({ family: f.family, status: f.status })));
            
            // Wait for Mynerve fonts to load
            await Promise.all(mynerveFonts.map(font => font.loaded.catch(() => {
              console.warn(`[PDFRendererService] Mynerve font failed to load: ${font.family}`);
            })));
            
            // Verify they're loaded
            const loadedMynerve = mynerveFonts.filter(f => f.status === 'loaded');
            console.log(`[PDFRendererService] Mynerve fonts loaded: ${loadedMynerve.length}/${mynerveFonts.length}`);
            } else {
              console.warn('[PDFRendererService] Mynerve font not found in document.fonts');
              // List all available fonts for debugging
              const allFonts = Array.from(document.fonts).map(f => ({ family: f.family, status: f.status }));
              console.log('[PDFRendererService] Available fonts:', JSON.stringify(allFonts.slice(0, 30), null, 2));
              
              // Try to load Mynerve font explicitly using the correct URL from Google Fonts
              console.log('[PDFRendererService] Attempting to load Mynerve font explicitly...');
              // The correct URL format for Google Fonts is: https://fonts.gstatic.com/s/fontname/v1/filename.woff2
              // Let's try multiple possible URLs
              const fontUrls = [
                'https://fonts.gstatic.com/s/mynerve/v1/7cH1v4Uiz5qdl1MvLwQ.woff2',
                'https://fonts.gstatic.com/s/mynerve/v2/7cH1v4Uiz5qdl1MvLwQ.woff2',
                'https://fonts.googleapis.com/css2?family=Mynerve&display=swap'
              ];
              
              let fontLoaded = false;
              for (const fontUrl of fontUrls) {
                try {
                  if (fontUrl.includes('css2')) {
                    // If it's a CSS URL, add it as a stylesheet
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = fontUrl;
                    document.head.appendChild(link);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    fontLoaded = true;
                    console.log('[PDFRendererService] Mynerve font stylesheet loaded');
                    break;
                  } else {
                    // If it's a woff2 URL, try to load it as FontFace
                    const fontFace = new FontFace('Mynerve', `url(${fontUrl})`);
                    await fontFace.load();
                    document.fonts.add(fontFace);
                    fontLoaded = true;
                    console.log('[PDFRendererService] Mynerve font loaded from:', fontUrl);
                    break;
                  }
                } catch (err) {
                  console.warn(`[PDFRendererService] Failed to load Mynerve font from ${fontUrl}:`, err.message);
                }
              }
              
              if (!fontLoaded) {
                console.error('[PDFRendererService] Could not load Mynerve font from any URL');
              }
              
              // Wait a bit for the font to be ready
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // Check again
              const mynerveFontsAfter = Array.from(document.fonts).filter(font => 
                font.family.toLowerCase().includes('mynerve')
              );
              console.log(`[PDFRendererService] Mynerve fonts after explicit load: ${mynerveFontsAfter.length}`);
            }
          
          let attempts = 0;
          const checkFonts = setInterval(() => {
            attempts++;
            const allLoaded = Array.from(document.fonts).every(font => {
              // For system fonts like "Bauhaus 93", status might be 'unloaded' but that's OK
              // Only check Google Fonts (those that were loaded via stylesheets)
              const fontFamily = font.family.toLowerCase();
              const isSystemFont = fontFamily.includes('bauhaus') || 
                                   fontFamily.includes('arial') || 
                                   fontFamily.includes('times') || 
                                   fontFamily.includes('georgia') ||
                                   fontFamily.includes('verdana') ||
                                   fontFamily.includes('tahoma') ||
                                   fontFamily.includes('impact') ||
                                   fontFamily.includes('courier') ||
                                   fontFamily.includes('consolas') ||
                                   fontFamily.includes('cambria') ||
                                   fontFamily.includes('garamond') ||
                                   fontFamily.includes('baskerville') ||
                                   fontFamily.includes('rockwell') ||
                                   fontFamily.includes('century gothic') ||
                                   fontFamily.includes('berlin sans');
              
              if (isSystemFont) {
                return true; // System fonts are always considered loaded
              }
              
              // For Google Fonts, check if status is 'loaded' or 'loading' (loading is OK, browser will use fallback)
              // But we want to wait a bit more for 'loading' fonts to become 'loaded'
              return font.status === 'loaded' || font.status === 'loading';
            });
            
            if (allLoaded || attempts > 100) {
              clearInterval(checkFonts);
              resolve();
            }
          }, 100);
        });
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
      
      console.log('[PDFRendererService] Stage debug info:', JSON.stringify(stageDebugInfo, null, 2));

      // Wait for renderComplete flag OR layers (fallback if callback doesn't fire)
      await page.evaluate(() => {
        return new Promise((resolve, reject) => {
          let attempts = 0;
          const checkRenderComplete = setInterval(() => {
            attempts++;
            
            // Check if renderComplete is set
            if (window.renderComplete === true) {
              clearInterval(checkRenderComplete);
              
              // Debug: Log render complete
              console.log('[DEBUG PDFRendererService] ✅ RENDER COMPLETE - Proceeding to screenshot:', {
                attempts: attempts,
                stageExists: !!window.konvaStage,
                layersCount: window.konvaStage ? window.konvaStage.getLayers().length : 0
              });
              
              resolve();
              return;
            }
            
            // Fallback: Check if stage has layers (rendering might be complete even without callback)
            const stage = window.konvaStage;
            if (stage && typeof stage.getLayers === 'function') {
              const layers = stage.getLayers();
              if (layers.length > 0) {
                // Check if layers have children (actual content)
                const hasContent = layers.some(layer => layer.getChildren().length > 0);
                if (hasContent && attempts > 10) {
                  // Give it a few more attempts to ensure rendering is done
                  if (attempts > 20) {
                    clearInterval(checkRenderComplete);
                    console.log('[DEBUG PDFRendererService] ⚠️ USING FALLBACK - Stage has content, proceeding:', {
                      attempts: attempts,
                      layersCount: layers.length,
                      totalChildren: layers.reduce((sum, l) => sum + l.getChildren().length, 0),
                      renderComplete: window.renderComplete
                    });
                    resolve();
                    return;
                  }
                }
              }
            }
            
            // Debug every 10 attempts
            if (attempts % 10 === 0) {
              console.log(`[DEBUG PDFRendererService] Waiting for renderComplete (attempt ${attempts}):`, {
                renderComplete: window.renderComplete,
                hasStage: !!window.konvaStage,
                stageLayers: window.konvaStage ? window.konvaStage.getLayers().length : 0,
                renderError: window.renderError || null
              });
            }
            
            // Timeout after 30 seconds
            if (attempts > 300) {
              clearInterval(checkRenderComplete);
              // Don't reject, just resolve with warning - layers might still be there
              console.warn('[DEBUG PDFRendererService] ⚠️ TIMEOUT - Proceeding anyway, renderComplete not set');
              resolve();
            }
          }, 100);
        });
      });
      
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
          console.log(`[DEBUG PDFRendererService] Layer ${idx}:`, {
            childrenCount: children.length,
            childrenTypes: children.map(c => c.getClassName()).slice(0, 10),
            childrenDetails: children.slice(0, 10).map(c => ({
              type: c.getClassName(),
              visible: c.visible(),
              x: c.x ? c.x() : null,
              y: c.y ? c.y() : null,
              width: c.width ? c.width() : null,
              height: c.height ? c.height() : null,
              opacity: c.opacity ? c.opacity() : null
            }))
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

