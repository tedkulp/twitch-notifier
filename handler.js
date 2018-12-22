'use strict';

const request = require('request-promise');
const crypto = require('crypto');
const Twitter = require('twitter');
const Masto = require('mastodon');

const SECRET = process.env.SIGNING_SECRET;
const USER_ID = process.env.USER_ID;
const USERNAME = process.env.USERNAME;
const CLIENT_ID = process.env.CLIENT_ID;
const TOPIC_URL = `https://api.twitch.tv/helix/streams?user_id=${USER_ID}`;
const URL_BASE = process.env.URL_BASE; // No slash at end

const twitterClient = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
});

var mastoClient = new Masto({
  access_token: process.env.MASTODON_ACCESS_TOKEN,
  timeout_ms: 60*1000,
  api_url: process.env.MASTODON_API_URL, // Slash at end
});

const webhookGet = async (event, context) => {
  if (event.queryStringParameters['hub.challenge'] && (event.queryStringParameters['hub.mode'] === 'subscribe' || event.queryStringParameters['hub.mode'] === 'unsubscribe')) {
    return {
      statusCode: 200,
      body: event.queryStringParameters['hub.challenge'],
    };
  } else {
    return {
      statusCode: 400,
      body: 'ERROR: Invalid request!',
    };
  }
};

const webhookPost = async (event, context) => {
  const signature = event.headers['x-hub-signature'].split('=')[1];
  const linkValid = event.headers['link'] && event.headers['link'].includes(TOPIC_URL);
  const sigValid = crypto.createHmac('sha256', SECRET).update(event.body).digest('hex') === signature;
  const body = event.body && JSON.parse(event.body);
  const isUpAndForUs = body['data'][0]['user_id'] === `${USER_ID}`;

  if (linkValid && sigValid) {
    if (isUpAndForUs) {
      // This is all async
      (async function() {
        const gameId = body['data'][0]['game_id'];
        const title = body['data'][0]['title'];

        const gameData = await request({
          uri: `https://api.twitch.tv/helix/games?id=${gameId}`,
          method: 'get',
          json: true,
          headers: {
            'Client-ID': CLIENT_ID,
            'Content-type': 'application/json',
          },
        });

        const currentGame = gameData && gameData['data'][0]['name'];
        const message = `Starting up a ${currentGame} stream: ${title}

https://twitch.tv/${USERNAME}`;
        twitterClient.post('statuses/update', { status: message }, (err, tweet, response) => {
          if (err) console.log(err);
          // console.log(err, tweet, response);
        });

        mastoClient.post('statuses', { status: message })
        .then(response => {
          // console.log(response);
        })
        .catch(err => {
          console.log(err);
        });
      })();
    }

    return {
      statusCode: 200,
      body: '{}',
    };
  } else {
    console.log('failed', linkValid, sigValid);
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: 'ERROR: Invalid request!'
      }),
    };
  }
};

const register = async (event, context) => {
  const registration = await request({
    method: 'POST',
    uri: 'https://api.twitch.tv/helix/webhooks/hub',
    headers: {
      'Client-ID': CLIENT_ID,
      'Content-type': 'application/json',
    },
    body: {
      'hub.mode': "subscribe",
      'hub.callback': `${URL_BASE}/webhook`,
      'hub.topic': TOPIC_URL,
      'hub.lease_seconds': 864000,
      'hub.secret': SECRET,
    },
    json: true,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless v1.0! Your function executed successfully!',
      input: event,
    }),
  };
};

const unregister = async (event, context) => {
  const registration = await request({
    method: 'POST',
    uri: 'https://api.twitch.tv/helix/webhooks/hub',
    headers: {
      'Client-ID': CLIENT_ID,
      'Content-type': 'application/json',
    },
    body: {
      'hub.mode': "unsubscribe",
      'hub.callback': `${URL_BASE}/webhook`,
      'hub.topic': TOPIC_URL,
      'hub.lease_seconds': 864000,
      'hub.secret': SECRET,
    },
    json: true,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Go Serverless v1.0! Your function executed successfully!',
      input: event,
    }),
  };
};

module.exports = {
  webhookGet,
  webhookPost,
  register,
  unregister,
  // test: async (event, context) => {
  //   console.log(process.env);

  //   return {
  //     statusCode: 200,
  //     body: JSON.stringify({
  //       message: 'Go Serverless v1.0! Your function executed successfully!',
  //       input: event,
  //     }),
  //   };
  // },
};