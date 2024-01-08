FROM node:slim
WORKDIR /wordcloud
COPY package*.json /wordcloud
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]