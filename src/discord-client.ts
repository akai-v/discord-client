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

    private discord: Discord;

    private botToken: string;

    private channelMap: Map<string, DiscordChannel>;
    private userMap: Map<string, DiscordUser>;

    constructor(token: string) {
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
        
        
        return new Promise((resolve, reject) => {
            this.discord.on('message', this.onClientMessage.bind(this));

            this.discord.once('ready', resolve);
        });
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

    isValidUser(user: User) {
        return user instanceof DiscordUser && user.Client === this;
    }

    isValidChannel(channel: Channel) {
        return channel instanceof DiscordChannel && channel.Client === this;
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

        let internalChannel = (channel as DiscordChannel).InternalChannel;
        
        if (internalChannel instanceof TextChannel || internalChannel instanceof GroupDMChannel || internalChannel instanceof DMChannel) {
            internalChannel.startTyping(5);

            return this.getSentMessageList(await internalChannel.send(text));
        }

        throw new Error("Channel does not allow message sending");
    }

}

export class DiscordClientHandler extends ClientHandler<DiscordClient> {

    constructor(client: DiscordClient, bot: Bot) {
        super(client, bot);
    }
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

}
