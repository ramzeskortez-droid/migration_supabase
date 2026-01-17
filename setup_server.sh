#!/bin/bash
set -e

# 1. Update System
echo "--- Updating System ---"
apt-get update && apt-get upgrade -y
apt-get install -y curl git unzip nano ufw

# 2. Install Docker & Docker Compose
if ! command -v docker &> /dev/null; then
    echo "--- Installing Docker ---"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# 3. Install Nginx
echo "--- Installing Nginx ---"
apt-get install -y nginx
systemctl enable nginx
systemctl start nginx

# 4. Install Node.js (LTS)
if ! command -v node &> /dev/null; then
    echo "--- Installing Node.js ---"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# 5. Install & Configure vsftpd (FTP)
echo "--- Configuring FTP (vsftpd) ---"
apt-get install -y vsftpd

# Backup original config
if [ ! -f /etc/vsftpd.conf.bak ]; then
    cp /etc/vsftpd.conf /etc/vsftpd.conf.bak
fi

# Write new config
cat > /etc/vsftpd.conf <<EOF
listen=NO
listen_ipv6=YES
anonymous_enable=NO
local_enable=YES
write_enable=YES
local_umask=022
dirmessage_enable=YES
use_localtime=YES
xferlog_enable=YES
connect_from_port_20=YES
chroot_local_user=YES
secure_chroot_dir=/var/run/vsftpd/empty
pam_service_name=vsftpd
rsa_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem
rsa_private_key=/etc/ssl/private/ssl-cert-snakeoil.key
ssl_enable=NO
pasv_enable=YES
pasv_min_port=40000
pasv_max_port=50000
user_sub_token=\$USER
local_root=/home/\$USER/ftp
allow_writeable_chroot=YES
EOF

# Create FTP user (if not exists)
FTP_USER="app_deployer"
FTP_PASS="Supabase2026!Deploy" # Запомните этот пароль!

if id "$FTP_USER" &>/dev/null; then
    echo "User $FTP_USER already exists"
else
    useradd -m $FTP_USER
    echo "$FTP_USER:$FTP_PASS" | chpasswd
    mkdir -p /home/$FTP_USER/ftp/files
    chown nobody:nogroup /home/$FTP_USER/ftp
    chmod a-w /home/$FTP_USER/ftp
    chown $FTP_USER:$FTP_USER /home/$FTP_USER/ftp/files
    echo "FTP User created: $FTP_USER / $FTP_PASS"
fi

systemctl restart vsftpd

# 6. Setup Firewall (UFW)
echo "--- Configuring Firewall ---"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 20/tcp
ufw allow 21/tcp
ufw allow 40000:50000/tcp
# Allow Supabase ports
ufw allow 8001/tcp # Studio (Custom Port)
ufw allow 8000/tcp # API
ufw allow 5432/tcp # Postgres
ufw --force enable

echo "--- SERVER SETUP COMPLETE ---"
echo "FTP User: $FTP_USER"
echo "FTP Pass: $FTP_PASS"
