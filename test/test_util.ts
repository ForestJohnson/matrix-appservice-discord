import * as Chai from "chai";

import { Util, ICommandAction, ICommandParameters } from "../src/util";

// we are a test file and thus need those
/* tslint:disable:no-unused-expression max-file-line-count no-any */

const expect = Chai.expect;

function CreateMockIntent(members) {
    return {
        getClient: () => {
            return {
                _http: {
                    authedRequestWithPrefix: async (_, __, url, ___, ____, _____) => {
                        const ret: any[] = [];
                        for (const member of members[url]) {
                            ret.push({
                                content: {
                                    displayname: member.displayname,
                                },
                                membership: member.membership,
                                state_key: member.mxid,
                            });
                        }
                        return {
                            chunk: ret,
                        };
                    },
                },
            };
        },
    };
}

describe("Util", () => {
    describe("MsgToArgs", () => {
        it("parses arguments", () => {
            const {command, args} = Util.MsgToArgs("!matrix command arg1 arg2", "!matrix");
            Chai.assert.equal(command, "command");
            // tslint:disable-next-line:no-magic-numbers
            Chai.assert.equal(args.length, 2);
            Chai.assert.equal(args[0], "arg1");
            Chai.assert.equal(args[1], "arg2");
        });
    });
    describe("ParseCommand", () => {
        it("parses commands", async () => {
            const action: ICommandAction = {
                params: ["param1", "param2"],
                run: async ({param1, param2}) => {
                    return `param1: ${param1}\nparam2: ${param2}`;
                },
            };
            const parameters: ICommandParameters = {
                param1: {
                    get: async (param: string) => {
                        return "param1_" + param;
                    },
                },
                param2: {
                    get: async (param: string) => {
                        return "param2_" + param;
                    },
                },
            };
            const retStr = await Util.ParseCommand(action, parameters, ["hello", "world"]);
            expect(retStr).equal("param1: param1_hello\nparam2: param2_world");
        });
    });
    describe("GetMxidFromName", () => {
        it("Finds a single member", async () => {
            const mockRooms = {
                "/rooms/abc/members": [
                    {
                        displayname: "GoodBoy",
                        membership: "join",
                        mxid: "@123:localhost",
                    },
                ],
            };
            const intent = CreateMockIntent(mockRooms);
            const mxid = await Util.GetMxidFromName(intent, "goodboy", ["abc"]);
            expect(mxid).equal("@123:localhost");
        });
        it("Errors on multiple members", async () => {
            const mockRooms = {
                "/rooms/abc/members": [
                    {
                        displayname: "GoodBoy",
                        membership: "join",
                        mxid: "@123:localhost",
                    },
                    {
                        displayname: "GoodBoy",
                        membership: "join",
                        mxid: "@456:localhost",
                    },
                ],
            };
            const intent = CreateMockIntent(mockRooms);
            try {
                await Util.GetMxidFromName(intent, "goodboy", ["abc"]);
                throw new Error("didn't fail");
            } catch (e) {
                expect(e.message).to.not.equal("didn't fail");
            }
        });
        it("Errors on no member", async () => {
            const mockRooms = {
                "/rooms/abc/members": [
                    {
                        displayname: "GoodBoy",
                        membership: "join",
                        mxid: "@123:localhost",
                    },
                ],
            };
            const intent = CreateMockIntent(mockRooms);
            try {
                await Util.GetMxidFromName(intent, "badboy", ["abc"]);
                throw new Error("didn't fail");
            } catch (e) {
                expect(e.message).to.not.equal("didn't fail");
            }
        });
    });
    describe("GetReplyFromReplyBody", () => {
        it("Should get a reply from the body", () => {
            const reply = Util.GetReplyFromReplyBody(`> <@alice:example.org> This is the original body

This is where the reply goes`);
            expect(reply).to.equal("This is where the reply goes");
        });
        it("Should get a multi-line reply from the body", () => {
            const reply = Util.GetReplyFromReplyBody(`> <@alice:example.org> This is the original body

This is where the reply goes and
there are even more lines here.`);
            expect(reply).to.equal("This is where the reply goes and\nthere are even more lines here.");
        });
        it("Should get empty string from an empty reply", () => {
            const reply = Util.GetReplyFromReplyBody(`> <@alice:example.org> This is the original body
`);
            expect(reply).to.equal("");
        });
        it("Should return body if no reply found", () => {
            const reply = Util.GetReplyFromReplyBody("Test\nwith\nhalfy");
            expect(reply).to.equal("Test\nwith\nhalfy");
        });
    });
});
