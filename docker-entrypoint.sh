#!/bin/bash

# Miguel's repeatCMD. Lifesaver!
repeatCMD () {
    count="0"
    maxcount="24"

    $@
    while [ $? -ne 0 ]; do
        sleep 5
        echo " ===> I try again...${count}/${maxcount}"
        count="$(($count + 1))"
        if [ $count -eq ${maxcount} ]; then
            echo " ===> ERR: Max number of retry. Quitting..."
            exit 127
        fi
        $@
    done
}

echo "Running NPM Install"
sh -c 'cd /var/www && npm install'

echo "Check if MongoDB database is up"
repeatCMD nc -w 2 ${DATABASE_HOST} ${DATABASE_PORT}
echo "Database is up! Starting FormIO..."

echo "Prepare MongoDB String"
mongodb="mongodb://${DATABASE_USER}:${DATABASE_PASS}@${DATABASE_HOST}:${DATABASE_PORT}/${DATABASE_NAME}"
export mongo=$mongodb
export USERNAME=${FORMIO_USERNAME}
export PASSWORD=${FORMIO_PASSWORD}
sh -c 'cd /var/www && npm start'
