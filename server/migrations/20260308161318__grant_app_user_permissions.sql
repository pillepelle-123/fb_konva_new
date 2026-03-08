BEGIN;

-- Change table ownership from postgres to fb_app_user
-- This allows fb_app_user to modify all tables (ALTER, DROP, etc.)
ALTER TABLE public.answers OWNER TO fb_app_user;
ALTER TABLE public.background_image_categories OWNER TO fb_app_user;
ALTER TABLE public.background_image_designs OWNER TO fb_app_user;
ALTER TABLE public.background_image_templates OWNER TO fb_app_user;
ALTER TABLE public.background_images OWNER TO fb_app_user;
ALTER TABLE public.book_friends OWNER TO fb_app_user;
ALTER TABLE public.books OWNER TO fb_app_user;
ALTER TABLE public.color_palettes OWNER TO fb_app_user;
ALTER TABLE public.conversation_invitations OWNER TO fb_app_user;
ALTER TABLE public.conversation_participant_settings OWNER TO fb_app_user;
ALTER TABLE public.conversation_participants OWNER TO fb_app_user;
ALTER TABLE public.conversations OWNER TO fb_app_user;
ALTER TABLE public.editor_settings OWNER TO fb_app_user;
ALTER TABLE public.friend_invitations OWNER TO fb_app_user;
ALTER TABLE public.friendships OWNER TO fb_app_user;
ALTER TABLE public.images OWNER TO fb_app_user;
ALTER TABLE public.layouts OWNER TO fb_app_user;
ALTER TABLE public.message_read_status OWNER TO fb_app_user;
ALTER TABLE public.messages OWNER TO fb_app_user;
ALTER TABLE public.page_assignments OWNER TO fb_app_user;
ALTER TABLE public.page_images OWNER TO fb_app_user;
ALTER TABLE public.pages OWNER TO fb_app_user;
ALTER TABLE public.pdf_exports OWNER TO fb_app_user;
ALTER TABLE public.pgmigrations OWNER TO fb_app_user;
ALTER TABLE public.question_pages OWNER TO fb_app_user;
ALTER TABLE public.question_pools OWNER TO fb_app_user;
ALTER TABLE public.questions OWNER TO fb_app_user;

-- Note: All sequences automatically follow their table ownership

COMMIT;
