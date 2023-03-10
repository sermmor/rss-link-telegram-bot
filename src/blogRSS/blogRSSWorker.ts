import { extract, ReaderOptions } from "@extractus/feed-extractor";
import { ChannelMediaRSSMessage, ChannelMediaRSSWorkerData, cleanLinksInMessage, filterRSSMessages, updateRSSListOneByOne } from "../channelMediaRSS";
import { parseFromBlogDateStringToDateObject, parseFromNitterDateStringToDateObject } from "../utils";
import { WorkerChild } from "../workerModule/workersManager";
import { BlogRSSWorkerData } from "./blogRSSWorkerData";

const updateRSS = (
    data: ChannelMediaRSSWorkerData,
    endpoint: string,
    nitterUrlIndex: number = 0,
    currentTry = 4
): Promise<ChannelMediaRSSMessage[]> => {
    const { rssOptions } = <BlogRSSWorkerData> data;
    return new Promise<ChannelMediaRSSMessage[]>(resolve =>
        extract(`${endpoint}`, rssOptions).then((data) => {
            // console.log(data)
            const currentMessages: ChannelMediaRSSMessage[] = mapRSSBlogPostsToMessages(data);
            console.log(`${endpoint}  ${currentMessages.length}`);
            resolve(currentMessages);
        }).catch(() => {
            if (currentTry > 0) {
                setTimeout(() => updateRSS(data, endpoint, nitterUrlIndex, currentTry - 1), 100);
            } else {
                console.error(`Nitter profile ${endpoint} is broken or deleted!`);
            }
    }));
}

const mapRSSBlogPostsToMessages = (data: any): ChannelMediaRSSMessage[] => data.entries.map((rssMessage: any) => ({
    title: rssMessage.title,
    author: data.title,
    date: parseFromBlogDateStringToDateObject(rssMessage.published),
    content: rssMessage.description,
    originalLink: rssMessage.link,
}));

(function () {
    const worker = new WorkerChild();
    
    updateRSSListOneByOne(
        worker.dataGettedFromParent,
        [],
        worker.dataGettedFromParent.urlProfiles.length,
        updateRSS,
        (allMessages) => worker.gatherSender(allMessages),
    );
})();

