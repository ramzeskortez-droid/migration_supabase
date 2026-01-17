#!/bin/bash
set -e

echo "--- Setting up Supabase ---"

# 1. Clone Repo
if [ ! -d "/root/supabase-docker" ]; then
    git clone --depth 1 https://github.com/supabase/supabase.git /root/supabase-docker
fi

cd /root/supabase-docker/docker

# 2. Config
if [ ! -f ".env" ]; then
    cp .env.example .env
fi

# 3. Generate Secrets (Python is reliable here)
# Install pyjwt if needed (usually not installed by default on minimal ubuntu)
apt-get install -y python3-pip
pip3 install pyjwt

echo "Generating keys..."
JWT_SECRET=$(openssl rand -base64 32 | tr -d /=+ | cut -c -32)

# Generate JWTs using Python
ANON_KEY=$(python3 -c "import jwt,time; print(jwt.encode({'role':'anon', 'iss':'supabase', 'iat':int(time.time()), 'exp':int(time.time())+315360000}, '$JWT_SECRET', algorithm='HS256'))")
SERVICE_KEY=$(python3 -c "import jwt,time; print(jwt.encode({'role':'service_role', 'iss':'supabase', 'iat':int(time.time()), 'exp':int(time.time())+315360000}, '$JWT_SECRET', algorithm='HS256'))")

# 4. Update .env
# Use perl or sed carefully. We'll use sed with different delimiter to avoid slash conflicts
sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|" .env
sed -i "s|ANON_KEY=.*|ANON_KEY=$ANON_KEY|" .env
sed -i "s|SERVICE_ROLE_KEY=.*|SERVICE_ROLE_KEY=$SERVICE_KEY|" .env

# Set Passwords
sed -i 's|POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=Supabase2026!DB|' .env
sed -i 's|DASHBOARD_USERNAME=.*|DASHBOARD_USERNAME=admin|' .env
sed -i 's|DASHBOARD_PASSWORD=.*|DASHBOARD_PASSWORD=Supabase2026!Dash|' .env

# 5. Start
echo "Starting Supabase..."
docker compose pull
docker compose up -d

echo "--- Supabase Setup Complete ---"
echo "Studio: http://77.222.53.52:3000 (admin / Supabase2026!Dash)"
echo "API: http://77.222.53.52:8000"
echo "Anon Key: $ANON_KEY"
echo "Service Key: $SERVICE_KEY"

# Save keys to a file for later use
echo "VITE_SUPABASE_URL=http://77.222.53.52:8000" > /root/supabase_keys.env
echo "VITE_SUPABASE_ANON_KEY=$ANON_KEY" >> /root/supabase_keys.env
echo "SUPABASE_SERVICE_KEY=$SERVICE_KEY" >> /root/supabase_keys.env
