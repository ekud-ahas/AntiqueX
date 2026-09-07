const { importMetItems } = require("./services/metImporter");

async function test() {
    try {
        const result = await importMetItems(5, "watch");

        console.log("IMPORT RESULT:");
        console.log(result);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

test();