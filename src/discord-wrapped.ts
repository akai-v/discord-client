import { User as InternalDiscordUser, Channel as InternalDiscordChannel, GroupDMChannel, GuildChannel, DMChannel, Message as InternalDiscordMessage } from "discord.js";

import { DiscordClient } from ".";

import { UserMessage, User, Channel, MessageAttachment } from "@akaiv/core";

/*
 * Created on Tue Oct 08 2019
 *
 * Copyright (c) storycraft. Licensed under the MIT Licence.
 */


export class DiscordUser extends User {

    private internalUser: InternalDiscordUser;

    constructor(client: DiscordClient, internalUser: InternalDiscordUser) {
        super(client, internalUser.id);

        this.internalUser = internalUser;
    }

    get Client() {
        return super.Client as DiscordClient;
    }

    get InternalUser() {
        return this.internalUser;
    }

    get Name() {
        return this.internalUser.username;
    }

    get HasDMChannel() {
        return true;
    }

    get HasAvatar() {
        return true;
    }

    async getAvatarURL(): Promise<string> {
        return this.internalUser.avatarURL;
    }

    async getDMChannel(): Promise<Channel> {
        if (this.internalUser.dmChannel) {
            return this.Client.getChannelFromInternal(this.internalUser.dmChannel);
        }

        return this.Client.getChannelFromInternal(await this.internalUser.createDM());
    }

}

export class DiscordChannel extends Channel {

    private internalChannel: InternalDiscordChannel;

    constructor(client: DiscordClient, internalChannel: InternalDiscordChannel) {
        super(client, internalChannel.id);

        this.internalChannel = internalChannel;
    }

    get InternalChannel() {
        return this.internalChannel;
    }
    
    get Name(): string {
        if (this.internalChannel instanceof GroupDMChannel || this.internalChannel instanceof GuildChannel) {
            return this.internalChannel.name;
        } else if (this.internalChannel instanceof DMChannel) {
            this.internalChannel.recipient.username;
        }

        return this.internalChannel.id;
    }
}

export class DiscordMessage extends UserMessage {

    private interalMessage: InternalDiscordMessage;

    constructor(sender: User, channel: Channel, interalMessage: InternalDiscordMessage, attachmentList: MessageAttachment[] = []) {
        super(sender, channel, interalMessage.content, attachmentList);

        this.interalMessage = interalMessage;
    }

    get InternalMessage() {
        return this.interalMessage;
    }

    get Editable(): boolean {
        throw this.interalMessage.editable;
    }

    get Deletable(): boolean {
        throw this.interalMessage.deletable;
    }

    async editText(text: string): Promise<UserMessage> {
        let message = await this.interalMessage.edit(text);

        return (this.Channel.Client as DiscordClient).getWrappedMessage(message);
    }

    async delete() {
        try {
            await this.interalMessage.delete();
        } catch (e) {
            return false;
        }

        return true;
    }

}