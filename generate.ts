import sharp from "sharp";
import { SkyUtil } from "skydapp-common";
import { SkyFiles } from "skydapp-nodejs";
import boyParts from "./parts/boy-parts.json";
import girlParts from "./parts/girl-parts.json";
import results from "./results.json";

const generate = async (path: string, baseAttr: any, parts: any) => {

    const id = (results as any).length;

    const result: any = {
        id,
        attributes: [baseAttr],
    };

    const imageParts: any[] = [];

    for (const [traitId, trait] of parts.entries()) {
        if (
            trait.condition === undefined ||
            result.attributes.find((d: any) => d.trait_type === trait.condition.trait && trait.condition.values.includes(d.value) === true) !== undefined
        ) {
            let partsLength = 0;
            let totalPercent = 0;
            let percentCount = 0;
            for (const part of trait.parts) {
                if (
                    (part as any).condition === undefined ||
                    result.attributes.find((d: any) => d.trait_type === (part as any).condition.trait && (part as any).condition.values.includes(d.value) === true) !== undefined
                ) {
                    partsLength += 1;
                    if ((part as any).percent !== undefined) {
                        totalPercent += (part as any).percent;
                        percentCount += 1;
                    }
                }
            }
            const basePercent = (100 - totalPercent) / (partsLength - percentCount);

            let rand = Math.random() * 100;
            for (const [partId, part] of trait.parts.entries()) {
                if (
                    (part as any).condition === undefined ||
                    result.attributes.find((d: any) => d.trait_type === (part as any).condition.trait && (part as any).condition.values.includes(d.value) === true) !== undefined
                ) {
                    rand -= (part as any).percent === undefined ? basePercent : (part as any).percent;
                    if (rand <= 0) {
                        result.attributes.push({ trait_type: trait.name, value: part.name });
                        imageParts.push({ traitId, partId });
                        break;
                    }
                }
            }
        }
    }

    // check duplicated
    if ((results as any).find((r: any) => JSON.stringify(r.attributes) === JSON.stringify(result.attributes)) !== undefined) {
        // retry.
        await generate(path, baseAttr, parts);
    }

    else {
        (results as any).push(result);

        let images: any[] = [];
        for (const imagePart of imageParts) {
            images = images.concat(parts[imagePart.traitId].parts[imagePart.partId].images);
        }
        images.sort((a, b) => a.order - b.order);

        const parameters: any[] = [];
        for (const image of images) {
            if (image !== undefined) {
                parameters.push({ input: path + image.path });
            }
        }

        try {

            await sharp({
                create: {
                    width: 1182,
                    height: 1182,
                    channels: 4,
                    background: { r: 255, g: 167, b: 173, alpha: 0 }
                }
            })
                .composite(parameters)
                .png()
                .toFile(`results/${id}.png`);

        } catch (error) {
            console.log(parameters);
            throw error;
        }

        console.log(`#${id} generated.`);
    }
};

(async () => {
    await SkyUtil.repeatResultAsync(972, async () => await generate("parts/", { trait_type: "Gender", value: "Boy" }, boyParts));
    await SkyUtil.repeatResultAsync(973, async () => await generate("parts/", { trait_type: "Gender", value: "Girl" }, girlParts));

    for (let i = results.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [results[i], results[j]] = [results[j], results[i]];
    }

    for (const [id, result] of results.entries()) {
        await SkyFiles.write(`images/${id}.png`, await SkyFiles.readBuffer(`results/${(result as any).id}.png`));
        (result as any).id = id;
        (result as any).image = `https://storage.googleapis.com/webplusone/thekoreans/images/${id}.png`;
        await SkyFiles.write(`metadata/${id}`, JSON.stringify(result));
    }
})();
