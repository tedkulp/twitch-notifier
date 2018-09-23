## Huh?

This is a serverless function for handling notifications when you go online on Twitch.
It assumes you have both a Twitch and Mastodon account you want to send to, so I'm not
sure it's terribly useful in it's current state to people.  This will get more work in
the future as my needs expand.

This assumes you have AWS setup with all the credentials and stuff.  It also assumes Serverless
is setup correctly on your computer.  Look for a good tutorial if this is all new to you.

## Setup

Create a copy of the env file

    cp .env.yml.sample .env.yml

Fill in with all your deets.  Then:

    yarn install

or:

    npm install

## Deployment

Because you don't know what the URL is going to be before the first deployement, deploy it once

    sls deploy

Fill in the BASE_URL in .env.yml with the base URL that serverless gave you.  Then redeploy.

    sls deploy

If this is the first time, you'll then need to manually register the webhook with Twitch.  After that,
the cron job should handle the re-registration every 7 days.

    curl https://somethingsomething.execute-api.us-east-1.amazonaws.com/dev/register

## Teardown

If for some reason you want to turn this off:

    curl https://somethingsomething.execute-api.us-east-1.amazonaws.com/dev/unregister
