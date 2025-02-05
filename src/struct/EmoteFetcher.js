const BTTVEmote = require('./BTTVEmote');
const Channel = require('./Channel');
const Collection = require('../util/Collection');
const Constants = require('../util/Constants');
const FFZEmote = require('./FFZEmote');
const TwitchEmote = require('./TwitchEmote');
const axios = require('axios');

const options = {
    responseType: 'json'
};

class EmoteFetcher {
    /**
     * Fetches and caches emotes.
     */
    constructor() {
        /**
         * Cached emotes.
         * Collectionped by emote code to Emote instance.
         * @type {Collection<string, Emote>}
         */
        this.emotes = new Collection();

        /**
         * Cached channels.
         * Collectionped by name to Channel instance.
         * @type {Collection<string, Channel>}
         */
        this.channels = new Collection();
    }

    /**
     * The global channel for both Twitch and BTTV.
     * @readonly
     * @type {?Channel}
     */
    get globalChannel() {
        return this.channels.get(null);
    }

    /**
     * Gets the raw Twitch emotes data for a channel.
     * @private
     * @param {int} id - Name of the channel.
     * @returns {Promise<Object[]>}
     */
    async _getRawTwitchEmotes(id) {
        const endpoint = !id
            ? Constants.Twitch.Global
            : Constants.Twitch.Channel(id); // eslint-disable-line new-cap

        const { data } = await axios.get(endpoint, options);

        return data;
    }

    /**
     * Converts and caches a raw twitch emote.
     * @private
     * @param {string} name - Name of the channel.
     * @param {Object} data - Raw data.
     * @returns {TwitchEmote}
     */
    _cacheTwitchEmote(name, data) {
        let channel = this.channels.get(name);
        if (!channel) {
            channel = new Channel(this, name);
            this.channels.set(name, channel);
        }

        const emote = new TwitchEmote(channel, data.id, data);
        this.emotes.set(emote.code, emote);
        channel.emotes.set(emote.code, emote);
        return emote;
    }

    /**
     * Gets the raw BTTV emotes data for a channel.
     * Use `null` for the global emotes channel.
     * @private
     * @param {int} [id=null] - ID of the channel.
     * @returns {Promise<Object[]>}
     */
    async _getRawBTTVEmotes(id) {
        const endpoint = !id
            ? Constants.BTTV.Global
            : Constants.BTTV.Channel(id); // eslint-disable-line new-cap

        const { data } = await axios.get(endpoint, options);

        if (data instanceof Array) return data;

        const { channelEmotes, sharedEmotes } = data;

        return [...channelEmotes, ...sharedEmotes];
    }

    /**
     * Converts and caches a raw BTTV emote.
     * @private
     * @param {string} name - Name of the channel.
     * @param {Object} data - Raw data.
     * @returns {BTTVEmote}
     */
    _cacheBTTVEmote(name, data) {
        let channel = this.channels.get(name);
        if (!channel) {
            channel = new Channel(this, name);
            this.channels.set(name, channel);
        }

        const emote = new BTTVEmote(channel, data.id, data);
        this.emotes.set(emote.code, emote);
        channel.emotes.set(emote.code, emote);
        return emote;
    }

    /**
     * Gets the raw FFZ emotes data for a channel.
     * @private
     * @param {(number|string)} id - ID or name of the channel.
     * @returns {Promise<Object[]>}
     */
    async _getRawFFZEmotes(id) {
        let endpoint;

        if (typeof id === 'number') {
            endpoint = Constants.FFZ.Channel(id); // eslint-disable-line new-cap
        } else {
            endpoint = Constants.FFZ.ChannelName(id); // eslint-disable-line new-cap
        }

        const { data } = await axios.get(endpoint, options);
        const emotes = [];

        for (const key of Object.keys(data.sets)) {
            const set = data.sets[key];
            emotes.push(...set.emoticons);
        }

        return emotes;
    }

    /**
     * Converts and caches a raw FFZ emote.
     * @private
     * @param {string} name - Name of the channel.
     * @param {Object} data - Raw data.
     * @returns {FFZEmote}
     */
    _cacheFFZEmote(name, data) {
        let channel = this.channels.get(name);
        if (!channel) {
            channel = new Channel(this, name);
            this.channels.set(name, channel);
        }

        const emote = new FFZEmote(channel, data.id, data);
        this.emotes.set(emote.code, emote);
        channel.emotes.set(emote.code, emote);
        return emote;
    }

    /**
     * Fetches the Twitch emotes for a channel.
     * Use `null` for the global emotes channel.
     * @param {int} [id=null] - ID of the channel.
     * @returns {Promise<Collection<string, TwitchEmote>>}
     */
    fetchTwitchEmotes(id = null) {
        return this._getRawTwitchEmotes(id).then(rawEmotes => {
            for (const data of rawEmotes.emotes) {
                this._cacheTwitchEmote(rawEmotes.channel_name, data);
            }

            return this.channels.get(rawEmotes.channel_name).emotes.filter(e => e.type === 'twitch');
        });
    }

    /**
     * Fetches the BTTV emotes for a channel.
     * Use `null` for the global emotes channel.
     * @param {string} [name=null] - Name of the channel.
     * @returns {Promise<Collection<string, BTTVEmote>>}
     */
    fetchBTTVEmotes(name = null) {
        return this._getRawBTTVEmotes(name).then(rawEmotes => {
            for (const data of rawEmotes) {
                this._cacheBTTVEmote(name, data);
            }

            return this.channels.get(name).emotes.filter(e => e.type === 'bttv');
        });
    }

    /**
     * Fetches the FFZ emotes for a channel.
     * @param {string} name - Name of the channel.
     * @returns {Promise<Collection<string, FFZEmote>>}
     */
    fetchFFZEmotes(name) {
        return this._getRawFFZEmotes(name).then(rawEmotes => {
            for (const data of rawEmotes) {
                this._cacheFFZEmote(name, data);
            }

            return this.channels.get(name).emotes.filter(e => e.type === 'ffz');
        });
    }
}

module.exports = EmoteFetcher;
