FROM node

RUN mkdir /myapp
WORKDIR /myapp

COPY package.json .
COPY package-lock.json .

RUN npm install

ADD . /myapp

CMD ["node", "index.js"]

EXPOSE 3000
