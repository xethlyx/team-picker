FROM node:14-alpine AS build-client
WORKDIR /usr/src/team-picker/client
RUN npm i -g pnpm

COPY client/package.json ./package.json
COPY client/pnpm-lock.yaml ./pnpm-lock.yaml

RUN pnpm i

COPY ./client .
RUN pnpm build

FROM node:14-alpine AS build-server
WORKDIR /usr/src/team-picker/server
RUN npm i -g pnpm

COPY server/package.json ./package.json
COPY server/pnpm-lock.yaml ./pnpm-lock.yaml

RUN pnpm i

COPY ./server .
COPY --from=build-client /usr/src/team-picker/client/dist ./client

RUN pnpm build
RUN rm -rf ./node_modules
RUN npm i --production
RUN rm -rf ./src

FROM node:14-alpine as prod
WORKDIR /usr/src/team-picker

COPY --from=build-server /usr/src/team-picker/server .

EXPOSE 3000

CMD ["npm", "start"]
