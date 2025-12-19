#!/bin/bash

# =========================================================
# freundebuch.io Deployment Script
# Handles Node.js/React app deployment with proper permissions
# =========================================================

# Project directory
PROJECT_DIR="/var/www/fb_konva_new"

# Deploy user (should be the Git owner)
DEPLOY_USER="root"

# Web server group
WEB_SERVER_GROUP="www-data"

echo "Starting deployment for ${PROJECT_DIR}..."

# --- Step 1: Ensure project directory ownership ---
echo "Setting ownership of ${PROJECT_DIR} to ${DEPLOY_USER}..."
sudo chown -R ${DEPLOY_USER}:${DEPLOY_USER} "${PROJECT_DIR}"
echo "Project directory ownership updated."

# --- Step 2: Change to project directory ---
echo "Changing to project directory: ${PROJECT_DIR}"
cd "${PROJECT_DIR}" || { echo "Error: Could not change to ${PROJECT_DIR}. Script aborted."; exit 1; }

# --- Step 3: Git pull (force overwrite) ---
echo "Executing git pull with force overwrite as ${DEPLOY_USER}..."
sudo -u ${DEPLOY_USER} git fetch origin main
sudo -u ${DEPLOY_USER} git reset --hard origin/main
sudo -u ${DEPLOY_USER} git clean -fd --exclude=deploy_fb.sh --exclude=ecosystem.config.js --exclude=server/.env --exclude=uploads/ --exclude=client/.env.production

echo "Git pull completed - local changes overwritten."

# --- Step 3b: Ensure ecosystem.config.js exists ---
if [ ! -f "ecosystem.config.js" ]; then
    echo "Recreating ecosystem.config.js..."
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'freundebuch-server',
    script: 'npm',
    args: 'start',
    cwd: './server',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    }
  }]
};
EOF
fi

# --- Step 3c: Determine uploads directory from .env or use default ---
echo "Determining uploads directory location..."
UPLOADS_DIR="${PROJECT_DIR}/uploads"  # Default: root/uploads

# Try to read UPLOADS_DIR from server/.env if it exists
if [ -f "server/.env" ]; then
    ENV_UPLOADS_DIR=$(grep "^UPLOADS_DIR=" server/.env | cut -d '=' -f2 | tr -d '"' | tr -d "'" | xargs)
    if [ -n "$ENV_UPLOADS_DIR" ]; then
        # If absolute path, use as is; if relative, make it absolute from PROJECT_DIR
        if [[ "$ENV_UPLOADS_DIR" == /* ]]; then
            UPLOADS_DIR="$ENV_UPLOADS_DIR"
        else
            UPLOADS_DIR="${PROJECT_DIR}/${ENV_UPLOADS_DIR}"
        fi
        echo "Using UPLOADS_DIR from .env: ${UPLOADS_DIR}"
    else
        echo "UPLOADS_DIR not set in .env, using default: ${UPLOADS_DIR}"
    fi
else
    echo "server/.env not found, using default: ${UPLOADS_DIR}"
fi

# --- Step 3d: Create uploads directory structure ---
echo "Creating uploads directory structure at ${UPLOADS_DIR}..."
sudo mkdir -p "${UPLOADS_DIR}"/{profile_pictures,images,background-images,stickers,pdf-exports,app}
sudo chown -R ${DEPLOY_USER}:${WEB_SERVER_GROUP} "${UPLOADS_DIR}"
sudo chmod -R 775 "${UPLOADS_DIR}"
echo "Uploads directory structure created."

# --- Step 3e: Run migration script if server/uploads exists (for first-time migration) ---
if [ -d "server/uploads" ] && [ "$(ls -A server/uploads 2>/dev/null)" ]; then
    echo "Found existing files in server/uploads - running migration..."
    # Load environment variables for migration script
    if [ -f "server/.env" ]; then
        export $(cat server/.env | grep -v '^#' | xargs)
    fi
    cd server
    sudo -u ${DEPLOY_USER} node scripts/migrate-uploads.js || echo "Warning: Migration script encountered errors (files may already be migrated)"
    cd ..
    echo "Migration completed."
fi

# --- Step 4: Install server dependencies ---
echo "Installing server dependencies as ${DEPLOY_USER}..."
cd server
sudo -u ${DEPLOY_USER} npm install --omit=dev || { echo "Error during server npm install!"; exit 1; }
# Ensure node_modules/.bin executables have proper permissions
if [ -d "node_modules/.bin" ]; then
    sudo chmod +x node_modules/.bin/* 2>/dev/null || true
    echo "Set executable permissions for node_modules/.bin"
fi
cd ..
echo "Server dependencies installed."

# --- Step 5: Install client dependencies and build ---
echo "Installing client dependencies and building as ${DEPLOY_USER}..."
cd client
sudo -u ${DEPLOY_USER} npm install || { echo "Error during client npm install!"; exit 1; }
# Ensure node_modules/.bin executables have proper permissions
if [ -d "node_modules/.bin" ]; then
    sudo chmod +x node_modules/.bin/* 2>/dev/null || true
    echo "Set executable permissions for node_modules/.bin"
fi
# Build main client application
# Run tsc -b but ignore errors and suppress output, then build with vite
echo "Running TypeScript type check (errors will be ignored)..."
sudo -u ${DEPLOY_USER} npx tsc -b >/dev/null 2>&1 || true
# Ensure vite is executable before building
if [ -f "node_modules/.bin/vite" ]; then
    sudo chmod +x node_modules/.bin/vite
fi
echo "Building client application with Vite..."
if ! sudo -u ${DEPLOY_USER} npx vite build; then
    echo "ERROR: Vite build failed! Check the output above for details."
    exit 1
fi
echo "Main client build completed successfully."
# Build PDF renderer
sudo -u ${DEPLOY_USER} npm run build:pdf-renderer || { echo "Error during PDF renderer build!"; exit 1; }
# Ensure executables remain executable after build
if [ -d "node_modules/.bin" ]; then
    sudo chmod +x node_modules/.bin/* 2>/dev/null || true
fi
cd ..
echo "Client built successfully."

# --- Step 6: Set final permissions ---
echo "Setting final file permissions for web server (${WEB_SERVER_GROUP})..."
sudo chown -R ${DEPLOY_USER}:${WEB_SERVER_GROUP} .
sudo find . -type d -exec chmod 775 {} +
sudo find . -type f -exec chmod 664 {} +

# Ensure node_modules/.bin executables remain executable (must be after chmod above)
if [ -d "client/node_modules/.bin" ]; then
    sudo chmod +x client/node_modules/.bin/* 2>/dev/null || true
    echo "Restored executable permissions for client/node_modules/.bin"
fi
if [ -d "server/node_modules/.bin" ]; then
    sudo chmod +x server/node_modules/.bin/* 2>/dev/null || true
    echo "Restored executable permissions for server/node_modules/.bin"
fi

# Ensure uploads directory (from UPLOADS_DIR or default) is writable
sudo chmod -R 775 "${UPLOADS_DIR}"
# Also ensure legacy server/uploads is writable (if it still exists, for backwards compatibility)
if [ -d "server/uploads" ]; then
    sudo chmod -R 775 server/uploads
fi

echo "File permissions updated."

# --- Step 7: Restart PM2 ---
echo "Restarting PM2 application..."
pm2 restart freundebuch-server || { echo "Error restarting PM2!"; exit 1; }
echo "PM2 restarted."

# --- Step 8: Reload Nginx ---
echo "Reloading Nginx..."
sudo systemctl reload nginx || { echo "Error reloading Nginx!"; exit 1; }
echo "Nginx reloaded."

# --- Step 9: Make deployment script executable ---
chmod +x deploy_fb.sh
echo "Deployment script permissions updated."

echo "Deployment completed successfully!"

