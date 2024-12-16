# if secrets folder exists, copy the static folder to the apps
if [ -d "secrets/static" ]; then
    mkdir -p apps/hub/public/internal-env
    cp -r secrets/static/* apps/hub/public/internal-env
fi