import { extract, ReaderOptions } from "@extractus/feed-extractor";
import { ChannelMediaRSSMessage } from "../channelMediaRSS";
import { parseFromNitterDateStringToDateObject } from "../utils";
import { WorkerChild } from "../workerModule/workersManager";
import { MastodonRSSWorkerData } from "./mastodonRSSWorkerData";

const updateRSSListOneByOne = (
    data: MastodonRSSWorkerData,
    messagesToConcat: ChannelMediaRSSMessage[][],
    rssUrlWaiting: number,
    onFinished: (allMessages: ChannelMediaRSSMessage[]) => void,
) => {

    if (rssUrlWaiting > 0) {
        // user example: `escepticos` 
        const { urlProfiles } = data;
        const url = urlProfiles[rssUrlWaiting - 1];
        updateRSS(data, url).then((currentMessages: ChannelMediaRSSMessage[]) => {
            messagesToConcat.push(currentMessages);
            setTimeout(() => updateRSSListOneByOne(data, messagesToConcat, rssUrlWaiting - 1, onFinished), 0);
        });
    } else {
        const allMessages = messagesToConcat
            .reduce((previous, current) => previous.concat(current))
            .sort((messageA, messageB) => messageA.date > messageB.date ? 1 : -1);
        onFinished(allMessages);
    }
}

const updateRSS = (
    data: MastodonRSSWorkerData,
    endpoint: string,
    nitterUrlIndex: number = 0,
    currentTry = 4
): Promise<ChannelMediaRSSMessage[]> => {
    const { rssOptions, mastoInstanceList } = data;
    return new Promise<ChannelMediaRSSMessage[]>(resolve =>
        extract(`${endpoint}`, rssOptions).then((data) => {
            const currentMessages: ChannelMediaRSSMessage[] = filterMastodonRSSMessages(
                cleanMastoLinksInMessages(
                    mapRSSMastodonPostsToMessages((data)), mastoInstanceList
                )
            );
            console.log(`${endpoint}  ${currentMessages.length}`);
            resolve(currentMessages);
        }).catch(() => {
            if (currentTry > 0) {
                setTimeout(() => updateRSS(data, endpoint, nitterUrlIndex, currentTry - 1), 100);
            } else {
                console.error(`Nitter profile ${endpoint} is broken or deleted!`);
                resolve([]);
            }
    }));
}

const mapRSSMastodonPostsToMessages = (data: any): ChannelMediaRSSMessage[] => data.item.map((rssMessage: any) => ({
    title: rssMessage.title,
    author: rssMessage.link.split('/')[3],
    date: parseFromNitterDateStringToDateObject(rssMessage.pubDate),
    content: rssMessage.description,
    originalLink: rssMessage.link,
}));

const cleanMastoLinksInMessages = (currentMessages: ChannelMediaRSSMessage[], mastoInstances: string[]): ChannelMediaRSSMessage[] => currentMessages.map(message => {
    const mastoUrl = mastoInstances.find(instance => message.originalLink.indexOf(instance) > 0);
    const urlToClean = `<a href=\"https://${mastoUrl}`
    const contentSplitted = message.content.split(urlToClean);
    const cleanedContentSplitter = contentSplitted.map(pieceContent => {
        const end = pieceContent.indexOf('</a>');
        return (pieceContent.charAt(0) === '/' && end > -1) ? pieceContent.substring(end + 4) : pieceContent;
    });
    return {
        ...message,
        content: cleanedContentSplitter.join(''),
    };
});

const filterMastodonRSSMessages = (currentMessages: ChannelMediaRSSMessage[]): ChannelMediaRSSMessage[]  => currentMessages.filter(
    ({ content }: ChannelMediaRSSMessage) => content.indexOf('<a href=\"') >= 0
);

(function () {
    const worker = new WorkerChild();
    
    updateRSSListOneByOne(
        worker.dataGettedFromParent,
        [],
        worker.dataGettedFromParent.urlProfiles.length,
        (allMessages) => worker.gatherSender(allMessages),
    );
})();