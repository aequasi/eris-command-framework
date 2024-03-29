import {Client, Collection, Member} from 'eris';

import CommandContext from '../CommandContext';
import CommandError from '../CommandError';
import TypeReaderResult from '../Result/TypeReaderResult';
import TypeReaderValue from '../Result/TypeReaderValue';
import Dictionary from '../Types/Dictionary';
import AbstractTypeReader from './AbstractTypeReader';

export default class MemberTypeReader extends AbstractTypeReader {
    private static addResult(results: Dictionary<string, TypeReaderValue>, user: Member, score: number): void {
        if (user && !results.hasOwnProperty(user.id)) {
            results[user.id] = new TypeReaderValue(user, score);
        }
    }

    public getTypes(): any[] {
        return [Member];
    }

    public read(client: Client, context: CommandContext, input: string): TypeReaderResult {
        const results: Dictionary<string, TypeReaderValue> = {};

        if (!context.guild) {
            return TypeReaderResult.fromError(CommandError.ObjectNotFound, 'Not in guild context.');
        }

        const guildUsers: Collection<Member> = context.guild.members;

        // By Mention (1.0)
        const mentionRegex: RegExp = /^<@!?(\d+)>$/;
        if (mentionRegex.test(input)) {
            MemberTypeReader.addResult(results, guildUsers.find((x) => x.id === mentionRegex.exec(input)[1]), 1.00);
        }

        // By ID (0.9)
        const idRegex: RegExp = /^(\d+)$/;
        if (idRegex.test(input)) {
            MemberTypeReader.addResult(results, guildUsers.find((x) => x.id === input), 0.90);
        }

        // By Username + Discrim (0.7-0.85)
        const index: number = input.lastIndexOf('#');
        if (index > 0) {
            const username: string = input.substring(0, index);
            const discrim: string  = input.substring(index + 1);

            const guildUser: Member = guildUsers.find(
                (x) => x.user.discriminator === discrim && x.username.toLowerCase() === username.toLowerCase(),
            );

            if (guildUser) {
                MemberTypeReader.addResult(results, guildUser, guildUser.username === username ? 0.85 : 0.75);
            }
        }

        // By Username (0.5-0.65)
        for (const user of guildUsers.filter((x) => x.username.toLowerCase() === input.toLowerCase())) {
            MemberTypeReader.addResult(results, user, user.username === input ? 0.65 : 0.55);
        }

        // By Nickname (0.5-0.65)
        for (const user of context.guild.members.filter((x) => x.nick && x.nick.toLowerCase() === input.toLowerCase())) {
            MemberTypeReader.addResult(results, user, user.username === input ? 0.65 : 0.55);
        }

        if (Object.keys(results).length > 0) {
            return TypeReaderResult.fromSuccess(Object.values(results));
        }

        return TypeReaderResult.fromError(CommandError.ObjectNotFound, 'user not found.');
    }
};
