import { DiscordClient } from "./discord-client";
import { TemplateHandler, RichMessageTemplate, UserMessage, AttachmentTemplate, TitledLinkImageTemplate } from "@akaiv/core";
import { DiscordChannel } from "./discord-wrapped";
import { TextChannel, GroupDMChannel, DMChannel, Attachment as DiscordAttachment, RichEmbed } from "discord.js";

/*
 * Created on Tue Oct 08 2019
 *
 * Copyright (c) storycraft. Licensed under the MIT Licence.
 */


export class AttachmentTemplateHandler extends TemplateHandler<DiscordClient> {

    canHandle(template: RichMessageTemplate): boolean {
        return template && template.TemplateName === 'attachment';
    }
    
    async send(template: AttachmentTemplate, channel: DiscordChannel): Promise<UserMessage[]> {
        let internalChannel = channel.InternalChannel;

        if (internalChannel instanceof TextChannel || internalChannel instanceof GroupDMChannel || internalChannel instanceof DMChannel) {
            let list: UserMessage[] = [];
            internalChannel.startTyping();

            let firstAttachment = template.AttachmentList[0];

            list.push(...this.Client.getSentMessageList(await internalChannel.send(template.Text, new DiscordAttachment(firstAttachment.Buffer, firstAttachment.Name))));

            let length = template.AttachmentList.length;
            for (let i = 1; i < length; i++) {
                let attachment = template.AttachmentList[i];

                list.push(...this.Client.getSentMessageList(await internalChannel.send('', new DiscordAttachment(attachment.Buffer, attachment.Name))));
            }

            internalChannel.stopTyping(true);

            return list;
        }

        throw new Error(`Can't send template message ${template.toString()} to ${channel.IdentityId}. Target channel is not text channel`);
    }


}

export class TitledLinkImageTemplateHandler extends TemplateHandler<DiscordClient> {

    canHandle(template: RichMessageTemplate): boolean {
        return template && template.TemplateName === 'LINKIMAGE';
    }

    async send(template: TitledLinkImageTemplate, channel: DiscordChannel): Promise<UserMessage[]> {
        let chan: TextChannel = channel.InternalChannel as TextChannel;

        let embed = new RichEmbed().setColor('#ffffff').setTitle(template.Title).setURL(template.HrefURL).setImage(template.ImageURL);

        return this.Client.getSentMessageList(await chan.send(embed));
    }
}