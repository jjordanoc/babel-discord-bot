import {EndBehaviorType, getVoiceConnection, VoiceConnection, VoiceReceiver} from '@discordjs/voice';
import Express from "express";
import {Request, Response} from "express";
import {pipeline} from 'node:stream';
import * as prism from 'prism-media';
import {createWriteStream} from 'node:fs';
import bodyParser from "body-parser";

interface ListenRequestBody {
    guildId: string;
    userId: string;
}

interface ListenRequest extends Request {
    body: ListenRequestBody;
}

const app = Express();
app.use(bodyParser.json());

const port = 3000;

app.post("/listen", (req: ListenRequest, res: Response) => {
    const {guildId, userId} = req.body;
    console.log(`body: ${JSON.stringify(req.body)}, guildId: ${guildId}, userId: ${userId}`);
    const connection: VoiceConnection = getVoiceConnection(guildId);
    res.status(200).send(`Successfully started listening to voice channel ${guildId}`);
    const receiver = connection.receiver;
    const opusStream = receiver.subscribe(userId, {
        end: {
            behavior: EndBehaviorType.AfterSilence,
            duration: 1000,
        },
    });
    const oggStream = new prism.opus.OggLogicalBitstream({
        opusHead: new prism.opus.OpusHead({
            channelCount: 2,
            sampleRate: 48000,
        }),
        pageSizeControl: {
            maxPackets: 10,
        },
    });

    const filename = `./recordings/${Date.now()}.ogg`;

    const out = createWriteStream(filename);

    console.log(`👂 Started recording ${filename}`);

    pipeline(opusStream, oggStream, out, (err) => {
        if (err) {
            console.warn(`❌ Error recording file ${filename} - ${err.message}`);
        } else {
            console.log(`✅ Recorded ${filename}`);
        }
    });
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

