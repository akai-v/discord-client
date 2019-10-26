import { expect } from 'chai';
import { DiscordClient } from '../src/discord-client';

/*
 * Created on Tue Oct 08 2019
 *
 * Copyright (c) storycraft. Licensed under the MIT Licence.
 */

class TestDiscordClient extends DiscordClient {

}

let client = new TestDiscordClient({
    token: ''
});

// umm how should we test