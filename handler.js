'use strict';

const request = require('request-promise');
const crypto = require('crypto');
const Twitter = require('twitter');
const Masto = require('mastodon');
const Articles = require('articles');
const { get } = require('lodash');

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

const webhookGet = async (req, res, _next) => {
  if (req.query['hub.challenge'] && (req.query['hub.mode'] === 'subscribe' || req.query['hub.mode'] === 'unsubscribe')) {
    return res.status(200).send(req.query['hub.challenge']);
  } else {
    return res.status(400).send('ERROR: Invalid request!');
  }
};

const webhookPost = async (req, res, _next) => {
  const signature = (req.get('x-hub-signature') || '=').split('=')[1];
  const linkValid = (req.get('link') || '').includes(TOPIC_URL);
  const localSig = crypto.createHmac('sha256', SECRET).update(get(req, 'rawBody', '')).digest('hex');
  const sigValid = localSig === signature;
  const isUp = !!get(req, 'body.data.0', false);

  console.log('headers', JSON.stringify(get(req, 'headers', '{}')));
  console.log('signature', signature);
  console.log('linkValid', linkValid);
  console.log('body', req.body);
  console.log('sigValid', sigValid, localSig, signature);
  console.log('isUp', isUp, get(req, 'body.data.0', ''));

  //TODO: How do we know this is actually us going live, or just a title/game change?
  //This could trigger false positives...  gross
  if (linkValid && sigValid) {
    console.info('link and sig are valid');
    if (isUp) {
      console.info('is up');

      // This is all async
      (async function() {
        const gameId = get(req, 'body.data.0.game_id', 0);
        const title = get(req, 'body.data.0.title', '');

        const gameData = await request({
          uri: `https://api.twitch.tv/helix/games?id=${gameId}`,
          method: 'get',
          json: true,
          headers: {
            'Client-ID': CLIENT_ID,
            'Content-type': 'application/json',
          },
        });

        console.log('gameData', JSON.stringify(gameData));

        const currentGame = get(gameData, 'data.0.name', 'Unknown');
        const message = `Starting up ${Articles.articlize(currentGame)} stream: ${title}

https://twitch.tv/${USERNAME}`;
        console.log('message', JSON.stringify(message));

        // twitterClient.post('statuses/update', { status: message }, (err, tweet, response) => {
        //   if (err) console.error(err);
        //   // console.log(err, tweet, response);
        // });

        // mastoClient.post('statuses', { status: message })
        // .then(response => {
        //   // console.log(response);
        // })
        // .catch(err => {
        //   console.error(err);
        // });

        // TODO: Save up value here
      })();
    } else {
      // TODO: Save down value here
    }

    return res.status(200).send('OK');
  } else {
    console.error('failed', linkValid, sigValid);
    return res.status(400).send('ERROR: Invalid request!');
  }
};

const register = async (_req, res, _next) => {
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

  return res.status(200).send('OK');
};

const unregister = async (_req, res, _next) => {
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

  return res.status(200).send('OK');
};

module.exports = {
  webhookGet,
  webhookPost,
  register,
  unregister,
};
