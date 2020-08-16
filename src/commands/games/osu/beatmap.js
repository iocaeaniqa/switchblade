const { SearchCommand, SwitchbladeEmbed, PaginatedEmbed, MiscUtils } = require('../../../')
const moment = require('moment')

module.exports = class OsuBeatmap extends SearchCommand {
  constructor (client) {
    super({
      name: 'beatmap',
      aliases: ['b'],
      parent: 'osu',
      parameters: [{
        type: 'string', full: true, missingError: 'commands:osu.subcommands.beatmap.noBeatmap'
      }],
      embedColor: '#E7669F',
      embedLogoURL: 'https://i.imgur.com/Ek0hnam.png'
    }, client)
  }

  async search (context, query) {
    return this.client.apis.osu.getBeatmap(query, 0, 10)
  }

  searchResultFormatter (obj) {
    return `[${obj.artist} - ${obj.title} (${obj.version})](${this.parentCommand.authorURL}/b/${obj.beatmap_id})`
  }

  async handleResult ({ t, channel, author, language, flags }, data) {
    channel.startTyping()
    const paginatedEmbed = new PaginatedEmbed(t, author)

    const mode = this.parentCommand.modes[Object.keys(flags).filter(key => flags[key])[0] || 'osu']
    const scores = await this.client.apis.osu.getBeatmapScores(data.beatmap_id, mode[0], 5)
    
    moment.locale(language)

    paginatedEmbed.addPage(new SwitchbladeEmbed(author)
      .setAuthor(mode[1], this.parentCommand.authorImage, `${this.parentCommand.authorURL}/b/${data.beatmap_id}`)
      .setTitle(`${data.artist} - ${data.title} (${data.version})`)
      .setColor(this.parentCommand.embedColor)
      .setImage(`https://assets.ppy.sh/beatmaps/${data.beatmapset_id}/covers/cover.jpg?${Date.now()}`)
      .setDescriptionFromBlockArray([
        [
          `${this.client.officialEmojis.get('length')} ${moment.duration(data.total_length * 1000).format('m:ss')} ${this.client.officialEmojis.get('bpm')} ${data.bpm}`,
          t('commands:osu.subcommands.beatmap.starDifficulty', { difficulty: Number(data.difficultyrating).toFixed(2) }),
          t('commands:osu.subcommands.beatmap.successRate', { rate: ((parseInt(data.passcount) / parseInt(data.playcount)) * 100 || 0).toFixed(1), successfulPlays: MiscUtils.formatNumber(data.passcount, language), totalPlays: MiscUtils.formatNumber(data.playcount, language) })
        ],
        [
          t('commands:osu.subcommands.beatmap.mappedBy', { mapper: `[${data.creator}](${this.parentCommand.authorURL}/u/${data.creator_id})` }),
          t('commands:osu.subcommands.beatmap.lastUpdate', { date: moment(data.last_update).format('LLL'), timeAgo: moment(data.last_update).fromNow() }),
          Number(data.approved) > 0 ? t('commands:osu.subcommands.beatmap.approved', { date: moment(data.approved_date).format('LLL'), timeAgo: moment(data.approved_date).fromNow() }) : null,
          data.tags ? t('commands:osu.subcommands.beatmap.tags', { tags: data.tags.split(' ').map(t => `\`${t}\``).join(', ') }) : null
        ],
        [
          t('commands:osu.subcommands.beatmap.download', { link: `${this.parentCommand.authorURL}/beatmapsets/${data.beatmapset_id}/download`, linkNoVideo: `${this.parentCommand.authorURL}/beatmapsets/${data.beatmapset_id}/download?noVideo=1` })
        ]
      ]))

    if (scores.length > 0) {
      paginatedEmbed.addPage(new SwitchbladeEmbed(author)
        .setAuthor(mode[1], this.parentCommand.authorImage, `${this.parentCommand.authorURL}/b/${data.beatmap_id}`)
        .setTitle(`${data.artist} - ${data.title} (${data.version})`)
        .setColor(this.parentCommand.embedColor)
        .setDescriptionFromBlockArray([
          [
            t('commands:osu.subcommands.beatmap.topScores')
          ],
          [
            scores.map((score, i) => {
              return `#${i + 1} - **[${score.username}](${this.parentCommand.authorURL}/u/${score.user_id})** ${this.client.officialEmojis.get(score.rank.length === 1 ? `${score.rank.toLowerCase()}_` : score.rank.toLowerCase())} - ${score.count300} ${this.client.officialEmojis.get('300')} (${score.countgeki} ${this.client.officialEmojis.get('geki')}), ${score.count100} ${this.client.officialEmojis.get('100')} (${score.countkatu} ${this.client.officialEmojis.get('katu')}), ${score.countmiss} ${this.client.officialEmojis.get('miss')}`
            }).join('\n')
          ]
        ]))
    }

    paginatedEmbed.run(await channel.send('...'))
    channel.stopTyping()
  }
}