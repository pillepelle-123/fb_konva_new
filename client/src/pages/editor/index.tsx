import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { useEditor, createSampleBook } from '../../context/editor-context';
import EditorBar from '../../components/features/editor/editor-bar';
import Toolbar from '../../components/features/editor/toolbar';
import Canvas from '../../components/features/editor/canvas';
import { ZoomProvider } from '../../components/features/editor/canvas/zoom-context';
import ToolSettingsPanel, { type ToolSettingsPanelRef } from '../../components/features/editor/tool-settings/tool-settings-panel';
import { StatusBar } from '../../components/features/editor/status-bar';
import { toast } from 'sonner';
import QuestionSelectionHandler from '../../components/features/editor/question-selection-handler';
import TemplateGallery from '../../components/templates/template-gallery';
import { fetchTemplates, fetchColorPalettes, apiService } from '../../services/api';
import { getGlobalTheme, getThemePageBackgroundColors } from '../../utils/global-themes';
import { applyBackgroundImageTemplate } from '../../utils/background-image-utils';
import type { PageBackground } from '../../context/editor-context';


function EditorContent() {
  const { bookId } = useParams<{ bookId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, dispatch, loadBook, undo, redo, saveBook, canAccessEditor, canEditCanvas, ensurePagesLoaded } = useEditor();
  const toolSettingsPanelRef = useRef<ToolSettingsPanelRef>(null);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);

  const openPreviewOnLoad = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const preview = searchParams.get('preview');
    if (preview === null) return false;
    const normalized = preview.toLowerCase();
    return normalized === '' || normalized === 'true' || normalized === '1' || normalized === 'yes';
  }, [location.search]);

  // Load templates and palettes on mount
  useEffect(() => {
    const loadTemplateData = async () => {
      try {
        const [templatesData, palettesData] = await Promise.all([
          fetchTemplates(),
          fetchColorPalettes()
        ]);
        dispatch({ type: 'LOAD_TEMPLATES', payload: templatesData.templates });
        dispatch({ type: 'LOAD_COLOR_PALETTES', payload: palettesData.palettes });
      } catch (error) {
        console.error('Failed to load template data:', error);
      }
    };
    
    loadTemplateData();
  }, [dispatch]);
  
  // Apply wizard selections after book is loaded
  useEffect(() => {
    if (
      state.currentBook &&
      (state.wizardTemplateSelection.selectedTemplateId || state.wizardTemplateSelection.selectedPaletteId || state.wizardTemplateSelection.templateCustomizations) &&
      state.availableTemplates &&
      state.colorPalettes
    ) {
      const template = state.availableTemplates.find(t => t.id === state.wizardTemplateSelection.selectedTemplateId);
      const paletteFromPaletteId = state.colorPalettes.find(p => p.id === state.wizardTemplateSelection.selectedPaletteId) || null;
      const themeIdFromSelection = state.wizardTemplateSelection.templateCustomizations?.theme;
      const paletteFromSelection = state.wizardTemplateSelection.templateCustomizations?.palette || null;
      const palette = paletteFromPaletteId || paletteFromSelection || null;
      const themeId = themeIdFromSelection || state.currentBook.themeId || state.currentBook.bookTheme || null;

      if (template) {
        dispatch({ type: 'SET_BOOK_LAYOUT_TEMPLATE', payload: template.id });
        dispatch({
          type: 'APPLY_TEMPLATE_TO_PAGE',
          payload: {
            template,
            pageIndex: 0
          }
        });
        dispatch({
          type: 'SET_PAGE_LAYOUT_TEMPLATE',
          payload: { pageIndex: 0, layoutTemplateId: template.id }
        });
      }

      if (themeId) {
        dispatch({ type: 'SET_BOOK_THEME', payload: themeId, skipHistory: true });
        state.currentBook.pages.forEach((page, index) => {
          const pageThemeActionId = page.themeId || '__BOOK_THEME__';
          const effectiveThemeId = page.themeId || themeId;

          dispatch({
            type: 'SET_PAGE_THEME',
            payload: { pageIndex: index, themeId: pageThemeActionId, skipHistory: true }
          });

          dispatch({
            type: 'APPLY_THEME_TO_ELEMENTS',
            payload: {
              pageIndex: index,
              themeId: effectiveThemeId,
              skipHistory: true,
              preserveColors: true
            }
          });
        });
      }

      if (palette) {
        dispatch({ type: 'SET_BOOK_COLOR_PALETTE', payload: palette.id, skipHistory: true });
        dispatch({
          type: 'APPLY_COLOR_PALETTE',
          payload: {
            palette,
            applyToAllPages: true,
            skipHistory: true
          }
        });
      }

      if (!template && !palette && !themeId) {
        const simpleElement = {
          id: `element_${Date.now()}`,
          type: 'text' as const,
          textType: 'text' as const,
          x: 200,
          y: 200,
          width: 400,
          height: 100,
          text: '',
          fontSize: 16,
          fontFamily: 'Century Gothic, sans-serif',
          fontColor: '#1f2937',
          align: 'left' as const,
          padding: 12,
          cornerRadius: 8
        };
        dispatch({ type: 'ADD_ELEMENT', payload: simpleElement });
      }

      dispatch({
        type: 'SET_WIZARD_TEMPLATE_SELECTION',
        payload: {
          selectedTemplateId: null,
          selectedPaletteId: null,
          templateCustomizations: undefined
        }
      });
    }
  }, [state.currentBook, state.wizardTemplateSelection, state.availableTemplates, state.colorPalettes, dispatch]);

  useEffect(() => {
    if (bookId) {
      // Check if it's a temporary book ID
      if (bookId.startsWith('temp_') || bookId === 'new') {
        // Get temporary book data from window.tempBooks
        const tempBooks = (window as any).tempBooks;
        const tempBook = tempBooks?.get(bookId);
        
        // Create a new book in database immediately
        const createNewBook = async () => {
          try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const token = localStorage.getItem('token');
            
            // Debug logging (kann später entfernt werden)
            console.log('Creating book with:', {
              bookTheme: tempBook?.bookTheme,
              themeId: tempBook?.themeId,
              layoutTemplateId: tempBook?.layoutTemplateId,
              colorPaletteId: tempBook?.colorPaletteId
            });
            
            const response = await fetch(`${apiUrl}/books`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                name: tempBook?.name || 'New Book',
                pageSize: tempBook?.pageSize || 'A4',
                orientation: tempBook?.orientation || 'portrait',
                bookTheme: tempBook?.bookTheme || tempBook?.themeId || 'default',
                themeId: tempBook?.themeId || tempBook?.bookTheme || 'default',
                layoutTemplateId: tempBook?.layoutTemplateId || null,
                colorPaletteId: tempBook?.colorPaletteId || null,
                minPages: tempBook?.minPages ?? tempBook?.min_pages ?? null,
                maxPages: tempBook?.maxPages ?? tempBook?.max_pages ?? null,
                pagePairingEnabled: tempBook?.pagePairingEnabled ?? tempBook?.page_pairing_enabled ?? false,
                specialPagesConfig: tempBook?.specialPagesConfig ?? tempBook?.special_pages_config ?? null,
                layoutStrategy: tempBook?.layoutStrategy ?? null,
                layoutRandomMode: tempBook?.layoutRandomMode ?? tempBook?.layout_random_mode ?? null,
                assistedLayouts: tempBook?.assistedLayouts ?? tempBook?.assisted_layouts ?? null,
                groupChatEnabled: tempBook?.wizardGroupChatEnabled ?? false
              })
            });
            
            if (response.ok) {
              const newBook = await response.json();
              const wizardFriends = tempBook?.wizardFriends || [];
              const wizardFriendInvites = tempBook?.wizardFriendInvites || [];
              
              if (wizardFriends.length > 0) {
                try {
                  await Promise.all(
                    wizardFriends.map((friend: any) =>
                      fetch(`${apiUrl}/books/${newBook.id}/friends`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          friendId: friend.id,
                          role: friend.book_role || friend.role || 'author',
                          page_access_level: friend.pageAccessLevel || 'own_page',
                          editor_interaction_level: friend.editorInteractionLevel || 'full_edit',
                        }),
                      }),
                    ),
                  );
                } catch (friendError) {
                  console.warn('Failed to add wizard friends to book:', friendError);
                }
              }

              if (wizardFriendInvites.length > 0) {
                for (const invite of wizardFriendInvites) {
                  try {
                    await fetch(`${apiUrl}/invitations/send`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify({
                        name: invite.name,
                        email: invite.email,
                        bookId: newBook.id,
                      }),
                    });
                  } catch (inviteError) {
                    console.warn('Failed to send wizard invitation:', inviteError);
                  }
                }
              }
              
              // WICHTIG: Lade die Seiten aus der DB, um die korrekten IDs zu bekommen
              // Dann setze die Elemente aus dem temporären Buch
              if (tempBook?.pages && tempBook.pages.length > 0 && tempBook.pages[0].elements) {
                // Lade das Buch mit Seiten aus der DB, um die korrekten IDs zu bekommen
                const loadBookResponse = await fetch(`${apiUrl}/books/${newBook.id}`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                
                let dbBook = null;
                if (loadBookResponse.ok) {
                  dbBook = await loadBookResponse.json();
                }
                
                // Erstelle das Buch-Objekt mit den Elementen aus dem temporären Buch
                // Verwende die Seiten-IDs aus der DB, falls verfügbar
                const wizardThemeId = tempBook?.wizardSelections?.theme || tempBook?.bookTheme || tempBook?.themeId || null;
                const wizardPalette = tempBook?.wizardSelections?.palette || null;

                const bookWithElements = {
                  ...newBook,
                  id: newBook.id,
                  name: tempBook?.name || newBook.name,
                  pageSize: tempBook?.pageSize || newBook.pageSize || newBook.page_size,
                  orientation: tempBook?.orientation || newBook.orientation,
                  bookTheme: tempBook?.bookTheme || tempBook?.theme || newBook.bookTheme || newBook.book_theme,
                  themeId: tempBook?.themeId || newBook.themeId || newBook.theme_id,
                  colorPaletteId: tempBook?.colorPaletteId || tempBook?.palette?.id || newBook.colorPaletteId || newBook.color_palette_id,
                  layoutTemplateId: tempBook?.layoutTemplateId || tempBook?.selectedTemplateId || newBook.layoutTemplateId || newBook.layout_template_id,
                  minPages: tempBook?.minPages ?? newBook.minPages ?? newBook.min_pages ?? null,
                  maxPages: tempBook?.maxPages ?? newBook.maxPages ?? newBook.max_pages ?? null,
                  pagePairingEnabled: tempBook?.pagePairingEnabled ?? newBook.pagePairingEnabled ?? newBook.page_pairing_enabled ?? false,
                  specialPagesConfig: tempBook?.specialPagesConfig ?? newBook.specialPagesConfig ?? newBook.special_pages_config ?? null,
                  layoutStrategy: tempBook?.layoutStrategy ?? newBook.layoutStrategy ?? newBook.layout_strategy ?? 'same',
                  layoutRandomMode: tempBook?.layoutRandomMode ?? newBook.layoutRandomMode ?? newBook.layout_random_mode ?? 'single',
                  assistedLayouts: tempBook?.assistedLayouts ?? newBook.assistedLayouts ?? newBook.assisted_layouts ?? null,
                  pages: tempBook.pages.map((page: any, index: number) => {
                    const dbPage = dbBook?.pages?.[index];
                    const pageId = dbPage?.id;

                    let resolvedBackground = page.background;
                    const pageThemeOverrideId = page.themeId || null;
                    const pagePaletteOverrideId = page.colorPaletteId || null;
                    const effectiveThemeId = pageThemeOverrideId || wizardThemeId;

                    // Check if background was explicitly set by user (not inherited from theme)
                    // If background has backgroundImageTemplateId, it comes from theme
                    // If background type is pattern or color without templateId, it was explicitly set
                    const isImageBackground = page.background?.type === 'image' && page.background?.value;
                    const isPatternBackground = page.background?.type === 'pattern';
                    const isColorBackground = page.background?.type === 'color';
                    const hasBackgroundImageTemplateId = page.background?.backgroundImageTemplateId !== undefined;
                    
                    // Preserve backgrounds that were explicitly set by user
                    // Only override if background comes from theme (has backgroundImageTemplateId) or is undefined
                    const shouldPreserveBackground = isImageBackground || 
                      (isPatternBackground && !hasBackgroundImageTemplateId) ||
                      (isColorBackground && !hasBackgroundImageTemplateId);
                    
                    if (effectiveThemeId && !shouldPreserveBackground) {
                      const theme = getGlobalTheme(effectiveThemeId);
                      const paletteForBackground =
                        wizardPalette ||
                        pagePaletteOverrideId ||
                        tempBook?.colorPaletteId ||
                        state.currentBook?.colorPaletteId ||
                        null;
                      const themeColors = getThemePageBackgroundColors(
                        effectiveThemeId,
                        paletteForBackground || undefined
                      );
                      const backgroundOpacity = theme?.pageSettings?.backgroundOpacity ?? page.background?.opacity ?? 1;

                      // Check if theme has background image
                      const themeBackgroundImage = theme?.pageSettings?.backgroundImage;
                      if (themeBackgroundImage?.enabled && themeBackgroundImage.templateId) {
                        // Apply theme background image
                        const imageBackground = applyBackgroundImageTemplate(themeBackgroundImage.templateId, {
                          imageSize: themeBackgroundImage.size,
                          imageRepeat: themeBackgroundImage.repeat,
                          opacity: themeBackgroundImage.opacity ?? backgroundOpacity,
                          backgroundColor: themeColors.backgroundColor || wizardPalette?.colors.background || '#ffffff'
                        });
                        
                        if (imageBackground && imageBackground.value) {
                          resolvedBackground = {
                            ...imageBackground,
                            opacity: imageBackground.opacity ?? backgroundOpacity,
                            pageTheme: effectiveThemeId
                          };
                        }
                      } else if (theme?.pageSettings?.backgroundPattern?.enabled) {
                        const paletteBackgroundColor = page.background?.type === 'pattern'
                          ? page.background.patternForegroundColor || wizardPalette?.colors.background || themeColors.backgroundColor
                          : typeof page.background?.value === 'string'
                            ? page.background.value
                            : wizardPalette?.colors.background || themeColors.backgroundColor;
                        const palettePatternColor = page.background?.patternBackgroundColor
                          || wizardPalette?.colors.primary
                          || wizardPalette?.colors.accent
                          || themeColors.patternBackgroundColor;
                        
                        resolvedBackground = {
                          type: 'pattern' as const,
                          value: theme.pageSettings.backgroundPattern.style,
                          opacity: backgroundOpacity,
                          pageTheme: effectiveThemeId,
                          patternSize: theme.pageSettings.backgroundPattern.size,
                          patternStrokeWidth: theme.pageSettings.backgroundPattern.strokeWidth,
                          patternForegroundColor: paletteBackgroundColor,
                          patternBackgroundColor: palettePatternColor,
                          patternBackgroundOpacity: theme.pageSettings.backgroundPattern.patternBackgroundOpacity
                        };
                      } else {
                        const paletteBackgroundColor = page.background?.type === 'pattern'
                          ? page.background.patternForegroundColor || wizardPalette?.colors.background || themeColors.backgroundColor
                          : typeof page.background?.value === 'string'
                            ? page.background.value
                            : wizardPalette?.colors.background || themeColors.backgroundColor;
                        
                        resolvedBackground = {
                          type: 'color' as const,
                          value: paletteBackgroundColor,
                          opacity: backgroundOpacity,
                          pageTheme: effectiveThemeId
                        };
                      }
                    } else if (isImageBackground) {
                      // Ensure image background has pageTheme set
                      resolvedBackground = {
                        ...page.background,
                        pageTheme: effectiveThemeId || page.background?.pageTheme
                      };
                    }

                    return {
                      ...page,
                      background: resolvedBackground,
                      pageNumber: page.pageNumber || page.page_number || index + 1,
                      id: pageId || undefined,
                      database_id: pageId || undefined,
                      layoutTemplateId: page.layoutTemplateId || tempBook?.layoutTemplateId || null,
                      colorPaletteId: pagePaletteOverrideId,
                      themeId: pageThemeOverrideId
                    };
                  })
                };
                
                // Setze das Buch direkt im State mit den Elementen
                dispatch({ type: 'SET_BOOK', payload: bookWithElements });
                
                // Debug: Prüfe ob Elemente vorhanden sind
                console.log('Saving book with elements:', {
                  pageCount: bookWithElements.pages.length,
                  firstPageElements: bookWithElements.pages[0]?.elements?.length || 0,
                  firstPageId: bookWithElements.pages[0]?.id,
                  firstPageDatabaseId: bookWithElements.pages[0]?.database_id
                });
                
                // Speichere das Buch mit den Elementen in der Datenbank
                try {
                  await apiService.saveBook(
                    bookWithElements,
                    {},
                    {},
                    [],
                    {},
                    []
                  );
                  
                  // WICHTIG: Lade Editor-Settings und User-Permissions nach dem Setzen des Buches
                  // Dies stellt sicher, dass toolbarVisible und settingsPanelVisible korrekt gesetzt werden
                  try {
                    const token = localStorage.getItem('token');
                    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                    
                    // Lade Editor-Settings
                    const settingsResponse = await fetch(`${apiUrl}/editor-settings/${newBook.id}`, {
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (settingsResponse.ok) {
                      const editorSettings = await settingsResponse.json();
                      dispatch({ type: 'SET_EDITOR_SETTINGS', payload: editorSettings });
                    }
                    
                    // Lade User-Role und Permissions direkt (ohne das Buch nochmal zu laden)
                    // Dies verhindert, dass die Elemente überschrieben werden
                    const loadBookResponse = await fetch(`${apiUrl}/books/${newBook.id}`, {
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (loadBookResponse.ok) {
                      const loadBookData = await loadBookResponse.json();
                      const userRole = loadBookData.userRole;
                      const pageAssignments = loadBookData.pageAssignments || [];
                      
                      if (userRole) {
                        dispatch({ type: 'SET_USER_ROLE', payload: { role: userRole.role, assignedPages: userRole.assignedPages || [] } });
                        dispatch({ type: 'SET_USER_PERMISSIONS', payload: { 
                          pageAccessLevel: userRole.page_access_level || 'all_pages', 
                          editorInteractionLevel: userRole.editor_interaction_level || 'full_edit_with_settings' 
                        } });
                      } else {
                        // Default permissions for book owner
                        dispatch({ type: 'SET_USER_PERMISSIONS', payload: { 
                          pageAccessLevel: 'all_pages', 
                          editorInteractionLevel: 'full_edit_with_settings' 
                        } });
                      }
                      
                      // Load page assignments
                      const pageAssignmentsMap: Record<number, any> = {};
                      pageAssignments.forEach((assignment: any) => {
                        pageAssignmentsMap[assignment.page_number] = {
                          id: assignment.user_id,
                          name: assignment.name,
                          email: assignment.email,
                          role: assignment.role
                        };
                      });
                      dispatch({ type: 'SET_PAGE_ASSIGNMENTS', payload: pageAssignmentsMap });
                      
                      // Load questions and answers
                      const questions = loadBookData.questions || [];
                      const answers = loadBookData.answers || [];
                      questions.forEach((q: any) => {
                        dispatch({ type: 'UPDATE_TEMP_QUESTION', payload: { questionId: q.id, text: q.question_text, questionPoolId: q.question_pool_id } });
                      });
                      answers.forEach((a: any) => {
                        dispatch({ type: 'UPDATE_TEMP_ANSWER', payload: { questionId: a.question_id, text: a.answer_text, userId: a.user_id, answerId: a.id } });
                      });
                      
                      // Set questionOrder on qna elements based on display_order
                      const questionOrderMap = new Map<string, number>();
                      questions.forEach((q: any) => {
                        if (q.id && (q.display_order !== null && q.display_order !== undefined)) {
                          questionOrderMap.set(q.id, q.display_order);
                        }
                      });
                      
                      if (questionOrderMap.size > 0 && dbBook?.pages) {
                        dbBook.pages.forEach((page: any) => {
                          if (page.elements) {
                            page.elements.forEach((element: any) => {
                              if (element.textType === 'qna' && element.questionId) {
                                const displayOrder = questionOrderMap.get(element.questionId);
                                if (displayOrder !== undefined) {
                                  element.questionOrder = displayOrder;
                                }
                              }
                            });
                          }
                        });
                      }
                    }
                    
                    // Load book friends
                    try {
                      const friendsResponse = await fetch(`${apiUrl}/books/${newBook.id}/friends`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                      });
                      if (friendsResponse.ok) {
                        const bookFriends = await friendsResponse.json();
                        dispatch({ type: 'SET_BOOK_FRIENDS', payload: bookFriends });
                      }
                    } catch (friendsError) {
                      console.warn('Failed to load book friends:', friendsError);
                    }
                  } catch (loadError) {
                    console.warn('Failed to load additional book data:', loadError);
                  }
                } catch (saveError) {
                  console.error('Failed to save book elements:', saveError);
                  // Falls das Speichern fehlschlägt, lade das Buch trotzdem (ohne Elemente)
                  loadBook(newBook.id);
                }
              } else {
                // Falls keine Elemente vorhanden sind, lade das Buch normal
                loadBook(newBook.id);
              }
              
              // Apply wizard selections if available
              if (tempBook?.wizardSelections) {
                const { template, theme, palette } = tempBook.wizardSelections;
                
                // Set wizard template selection in context for later use
                dispatch({ 
                  type: 'SET_WIZARD_TEMPLATE_SELECTION', 
                  payload: {
                    selectedTemplateId: template?.id || null,
                    selectedPaletteId: palette?.id || null,
                    templateCustomizations: { theme, palette }
                  }
                });
              }
              
              // Clean up temporary book
              if (tempBooks) {
                tempBooks.delete(bookId);
              }
              
              // Update URL to use real ID
              window.history.replaceState(null, '', `/editor/${newBook.id}`);
            } else {
              console.error('Failed to create book');
            }
          } catch (error) {
            console.error('Failed to create book:', error);
          }
        };
        
        createNewBook();
        return;
      }
      
      // Try to load existing book from database
      if (!isNaN(Number(bookId))) {
        loadBook(Number(bookId)).catch((error) => {
          console.error('Failed to load book:', error);
        });
      }
    }
  }, [bookId, loadBook, dispatch]);

  // Handle page parameter from URL on book load
  const pageParamRef = useRef<string | null>(null);
  useEffect(() => {
    if (!state.currentBook || !bookId) return;
    
    const searchParams = new URLSearchParams(location.search);
    const pageParam = searchParams.get('page');
    
    // Only process if page parameter changed (to avoid loops)
    if (pageParam && pageParam !== pageParamRef.current) {
      pageParamRef.current = pageParam;
      const requestedPageNumber = parseInt(pageParam, 10);
      if (!isNaN(requestedPageNumber) && requestedPageNumber >= 1) {
        // Get total pages count
        const totalPages = state.pagePagination?.totalPages ?? 
          (state.currentBook.pages.length 
            ? Math.max(...state.currentBook.pages.map((p) => p.pageNumber ?? 0), 0)
            : state.currentBook.pages.length);
        
        // Validate page number
        if (requestedPageNumber <= totalPages) {
          // Find page index by pageNumber
          const pageIndex = state.currentBook.pages.findIndex(
            (page) => page.pageNumber === requestedPageNumber
          );
          
          if (pageIndex !== -1) {
            // Page found, navigate to it
            ensurePagesLoaded(pageIndex, pageIndex + 1);
            dispatch({ type: 'SET_ACTIVE_PAGE', payload: pageIndex });
          } else {
            // Page not loaded yet, try to load it
            ensurePagesLoaded(requestedPageNumber - 1, requestedPageNumber);
            dispatch({ type: 'SET_ACTIVE_PAGE', payload: requestedPageNumber - 1 });
          }
        }
      }
    } else if (!pageParam) {
      // Reset ref when page param is removed
      pageParamRef.current = null;
    }
  }, [state.currentBook, bookId, location.search, dispatch, ensurePagesLoaded]);

  // Update URL when active page changes
  const lastPageNumberRef = useRef<number | null>(null);
  useEffect(() => {
    if (!state.currentBook || !bookId) return;
    
    const currentPageNumber = state.currentBook.pages[state.activePageIndex]?.pageNumber ?? (state.activePageIndex + 1);
    
    // Only update URL if page number actually changed
    if (lastPageNumberRef.current !== currentPageNumber) {
      lastPageNumberRef.current = currentPageNumber;
      const searchParams = new URLSearchParams(location.search);
      searchParams.set('page', currentPageNumber.toString());
      navigate(`/editor/${bookId}?${searchParams.toString()}`, { replace: true });
    }
  }, [state.activePageIndex, state.currentBook, bookId, navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveBook().then(() => {
          toast.success('Book saved successfully');
        }).catch(console.error);
      }
    };

    const handleAddPage = () => {
      if (!state.currentBook) return;
      const currentPageCount = state.currentBook.pages.length;
      dispatch({ type: 'ADD_PAGE' });
      // Navigate to the newly added page
      setTimeout(() => {
        dispatch({ type: 'SET_ACTIVE_PAGE', payload: currentPageCount });
      }, 0);
    };

    const handleAddPagePairAtIndex = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { insertionIndex } = customEvent.detail;
      dispatch({ type: 'ADD_PAGE_PAIR_AT_INDEX', payload: { insertionIndex } });

      // Navigate to the first newly added page
      setTimeout(() => {
        dispatch({ type: 'SET_ACTIVE_PAGE', payload: insertionIndex });
      }, 0);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('addPage', handleAddPage);
    window.addEventListener('addPagePairAtIndex', handleAddPagePairAtIndex);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('addPage', handleAddPage);
      window.removeEventListener('addPagePairAtIndex', handleAddPagePairAtIndex);
    };
  }, [undo, redo, saveBook, state.currentBook, dispatch]);

  if (!state.currentBook) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>⟲</span>
          <p>Loading editor...</p>
        </div>
      </div>
    );
  }
  
  // Block editor access for no_access level or form_only access
  if (state.editorInteractionLevel === 'no_access' || state.pageAccessLevel === 'form_only') {
    window.location.href = `/books/${bookId}/answers`;
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-muted-foreground">
          <p>Redirecting to answer form...</p>
        </div>
      </div>
    );
  }

  // Filter pages based on page access level
  const getVisiblePages = () => {
    if (!state.currentBook) return [];
    
    if (state.pageAccessLevel === 'own_page' && state.assignedPages.length > 0) {
      // Show only assigned pages
      return state.currentBook.pages.filter((_, index) => 
        state.assignedPages.includes(index + 1)
      );
    }
    
    // Show all pages for 'all_pages' or when no restrictions
    return state.currentBook.pages;
  };

  const visiblePages = getVisiblePages();
  
  // If user has own_page access but current page is not visible, redirect to first visible page
  if (state.pageAccessLevel === 'own_page' && visiblePages.length > 0) {
    const currentPageNumber = state.activePageIndex + 1;
    if (!state.assignedPages.includes(currentPageNumber)) {
      const firstVisiblePageIndex = state.currentBook!.pages.findIndex((_, index) => 
        state.assignedPages.includes(index + 1)
      );
      if (firstVisiblePageIndex !== -1 && firstVisiblePageIndex !== state.activePageIndex) {
        // Use setTimeout to avoid state update during render
        setTimeout(() => {
          dispatch({ type: 'SET_ACTIVE_PAGE', payload: firstVisiblePageIndex });
        }, 0);
      }
    }
  }

  return (
    <ZoomProvider>
      <div className="h-full flex flex-col">
        <QuestionSelectionHandler />
        <EditorBar toolSettingsPanelRef={toolSettingsPanelRef} initialPreviewOpen={openPreviewOnLoad} />
        
        <div className="flex-1 min-h-0">
          <div className="h-full flex flex-col bg-background">
            <div className="flex-1 flex min-h-0">
              {canEditCanvas() && <Toolbar onOpenTemplates={() => setShowTemplateGallery(true)} />}
              <div className="flex-1 overflow-hidden bg-highlight">
                <Canvas />
              </div>
              {canEditCanvas() && <ToolSettingsPanel ref={toolSettingsPanelRef} onOpenTemplates={() => setShowTemplateGallery(true)} />}
            </div>
            
            <StatusBar />
          </div>

        <TemplateGallery
          isOpen={showTemplateGallery}
          onClose={() => setShowTemplateGallery(false)}
        />
      </div>
      
    </div>
    </ZoomProvider>
  );
}

export default function Editor() {
  return (
    <EditorContent />
  );
}