import { readFile, writeFileSync } from 'fs';
import { BlogRSSMessageList } from './blogRSS';
import { ChannelMediaRSSMessageList } from './channelMediaRSS';
import { MastodonRSSMessageList } from './mastodonRSS/mastodonRSSMessageList';
import { NitterRSSMessageList } from './nitterRSS';
import { TelegramBot } from './telegramBot/telegramBot';

const keysPath = 'build/keys.json';
const configurationPath = 'build/configuration.json';

let nitterRSS: NitterRSSMessageList;
let mastodonRSS: MastodonRSSMessageList;
let blogRSS: BlogRSSMessageList;

// TODO: Add configuration.json to README.md (update README.md with all the details).

// TODO: Add any RSS blog or news content!! (PUT IN THIS CASE THE normalization: true)
// TODO: Nitter command for any Twitter profile (?)  
// TODO: Think about do a front end website with React to read this information and edit configuration and rss list (local RSS reader, with electron do desktop apps for Windows, iOS and Android)

readFile(keysPath, (err, data) => {
    if (err) throw err;
    const keyData = JSON.parse(<string> <any> data);
    readFile(configurationPath, (err, data) => {
        if (err) throw err;
        const configurationData = JSON.parse(<string> <any> data);

        nitterRSS = new NitterRSSMessageList(configurationData);
        mastodonRSS = new MastodonRSSMessageList(configurationData);
        blogRSS = new BlogRSSMessageList(configurationData);

        const bot = new TelegramBot(keyData);
        bot.start({
            onCommandAll: getAllMessages,
            onCommandMasto: getAllMessagesChannelMediaRSS(mastodonRSS),
            onCommandNitter: getAllMessagesChannelMediaRSS(nitterRSS),
            onCommandBlog: getAllMessagesChannelMediaRSS(blogRSS),
        });
        
        console.log("> The bot is ready.");
    });
});

const getAllMessages = (): Promise<string[]> => new Promise<string[]>(
    resolve => nitterRSS.updateRSSList().then(() =>
        mastodonRSS.updateRSSList().then(() => {
            resolve(ChannelMediaRSSMessageList.formatListMessagesToTelegramTemplate([
                nitterRSS,
                mastodonRSS,
            ]));
        })));

const getAllMessagesChannelMediaRSS = (channelMediaRSS: ChannelMediaRSSMessageList) => (): Promise<string[]> => new Promise<string[]>(
    resolve => channelMediaRSS.updateRSSList().then(() => {
            resolve(channelMediaRSS.formatMessagesToTelegramTemplate());
        }));

const debugTweetsInFile = () => {
    // const strAllRss: string = JSON.stringify(nitterRSS.allMessages, null, 2); // TODO: COMMENT THIS, ONLY FOR DEBUG.
    // writeFileSync('allRss.json', strAllRss); // TODO: COMMENT THIS, ONLY FOR DEBUG.

    // console.log(`allTuits: ${numberOfResponses} vs messages: ${accTweets.length}`);
};
