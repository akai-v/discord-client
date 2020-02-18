import { Bot, Channel, UserMessage, User, BaseClient, ClientHandler, ClientUser } from "@akaiv/core";
import { Client as Discord, Channel as InternalDiscordChannel, User as InternalDiscordUser, Message as InternalDiscordMessage, DMChannel, GroupDMChannel, TextChannel } from "discord.js";
import { DiscordMessage, DiscordChannel, DiscordUser } from "./discord-wrapped";
import { AttachmentTemplateHandler } from "./discord-template-handler";

/*
 * Created on Sun Oct 06 2019
 *
 * Copyright (c) storycraft. Licensed under the MIT Licence.
 */

export class DiscordClient extends BaseClient {

    private static readonly MAX_TEXT_MESSAGE_LENGTH = 2000;

    private discord: Discord;

    private botToken: string;

    private channelMap: Map<string, DiscordChannel>;
    private userMap: Map<string, DiscordUser>;

    constructor({ token }: {
        token: string
    }) {
        super();
        this.botToken = token;

        // dummy object
        this.discord = new Discord();
        
        this.channelMap = new Map();
        this.userMap = new Map();

        this.RichHandlerList.push(new AttachmentTemplateHandler(this));
    }

    get Internal() {
        return this.discord;
    }

    get ClientId(): string {
        return 'discord';
    }

    get ClientName(): string {
        return 'Discord';
    }

    get MaxMessageTextLength() {
        return DiscordClient.MAX_TEXT_MESSAGE_LENGTH;
    }

    get ChannelList(): Channel[] {
        return Array.from(this.channelMap.values());
    }

    protected createHandler(bot: Bot): ClientHandler<BaseClient> {
        return new DiscordClientHandler(this, bot);
    }

    protected createClientUser() {
        return new DiscordClientUser(this);
    }

    protected async startClient(): Promise<void> {
        this.discord = new Discord();

        this.discord.login(this.botToken);

        this.discord.on('message', this.onClientMessage.bind(this));
        
        await new Promise((resolve, reject) => {
            this.discord.once('ready', resolve);
        });

        this.Logger.info(`Client logined as ${this.discord.user.username}`);
    }

    protected async stopClient(): Promise<void> {
        this.discord.destroy();

        this.userMap.clear();
        this.channelMap.clear();
    }

    getUserFromInternal(user: InternalDiscordUser): User {
        if (user.id === this.Internal.user.id) {
            return this.ClientUser!;
        }

        if (this.userMap.has(user.id)) {
            return this.userMap.get(user.id)!;
        }

        let wrappedUser = new DiscordUser(this, user);

        this.userMap.set(user.id, wrappedUser);

        return wrappedUser;
    }

    getChannelFromInternal(channel: InternalDiscordChannel): Channel {
        if (this.channelMap.has(channel.id)) {
            return this.channelMap.get(channel.id)!;
        }

        let wrappedChannel = new DiscordChannel(this, channel);

        this.channelMap.set(channel.id, wrappedChannel);

        return wrappedChannel;
    }

    isValidUser(user: User): boolean {
        return user && this.userMap.get(user.Id) === user;
    }

    isValidChannel(channel: Channel): boolean {
        return channel && this.channelMap.get(channel.Id) === channel;
    }

    protected onClientMessage(internalMessage: InternalDiscordMessage) {
        this.messageReceived(this.getWrappedMessage(internalMessage));
    }

    getWrappedMessage(internalMessage: InternalDiscordMessage): DiscordMessage {
        let sender = this.getUserFromInternal(internalMessage.author);
        let channel = this.getChannelFromInternal(internalMessage.channel);

        return new DiscordMessage(sender, channel, internalMessage);
    }

    getSentMessageList(internalMessage: InternalDiscordMessage | InternalDiscordMessage[]): DiscordMessage[] {
        let list: DiscordMessage[] = [];

        if (internalMessage instanceof InternalDiscordMessage) {
            list.push(this.getWrappedMessage(internalMessage));
        } else {
            for (let message of internalMessage) {
                list.push(this.getWrappedMessage(message));
            }
        }

        return list;
    }

    async sendText(text: string, channel: Channel): Promise<UserMessage[]> {
        if (!this.Started) {
            throw new Error(`Client is not connected`);
        }
        
        if (!this.isValidChannel(channel)) {
            throw new Error("Target channel is pointing wrong client.");
        }

        if (text.length < 1) return [];

        let internalChannel = (channel as DiscordChannel).InternalChannel;
        
        if (internalChannel instanceof TextChannel || internalChannel instanceof GroupDMChannel || internalChannel instanceof DMChannel) {
            internalChannel.startTyping();

            let chunkSize = Math.ceil(text.length / DiscordClient.MAX_TEXT_MESSAGE_LENGTH);

            let messageList: UserMessage[] = [];

            for (let i = 0; i < chunkSize; i++) {
                let textChunk = text.substr(i * DiscordClient.MAX_TEXT_MESSAGE_LENGTH, DiscordClient.MAX_TEXT_MESSAGE_LENGTH);

                let message = await internalChannel.send(textChunk);


                messageList = messageList.concat(this.getSentMessageList(message));
            }

            internalChannel.stopTyping(true);

            return messageList;
        }

        throw new Error("Channel does not allow message sending");
    }

}

export class DiscordClientHandler extends ClientHandler<DiscordClient> {
    
}

export class DiscordClientUser extends ClientUser {

    constructor(client: DiscordClient) {
        super(client, client.Internal.user.id);
    }

    get Client(): DiscordClient {
        return super.Client as DiscordClient;
    }

    get Connected() {
        return this.Client.Started;
    }

    get Name() {
        return this.Client.Internal.user.username;
    }

    get HasDMChannel() {
        return false;
    }

    get HasAvatar() {
        return true;
    }

    async getAvatarURL(): Promise<string> {
        return this.Client.Internal.user.avatarURL;
    }

}
