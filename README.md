# How to Install

## Method 1: On Docker

Since Ghost 6.0, the recommended (though preview) way to install Ghost is through Docker. As such, this is the way I have mostly tested this adapter. These installation steps are based off of the instructions/setup provided here: [Ghost Docker Install Instructions](https://docs.ghost.org/install/docker) .

1. Setup the repo
   1. `git clone https://github.com/idivait/ghost-storage-cloudflare-images.git /opt/ghost/cloudflare-images && cd /opt/ghost/cloudflare-images`
   2. `npm install --omit=dev`
   3. `npm run build`
2. Modify the env file
   1. `cp .env.storage.example .env.storage`
   2. Change the values as indicated in the env file. I've included links to find the values in the comments of the file.
3. Move env file and example override file to root of ghost install
   1. `mv .env.storage /opt/ghost/.env.storage`
   2. `mv compose.example.override.yml /opt/ghost/compose.override.yml`
4. Force recreate containers
   1. `docker compose down && docker compose up -d --force-recreate`
