const { existsSync, appendFile } = require("fs");
const { unlink } = require("fs").promises;

async function getLock(lockFileName, instanceLogPrefix, logger, timeout = 300) {
    let acquiredLock = false;
    while (!acquiredLock && timeout > 0) {
        await tryToGetLock(lockFileName, instanceLogPrefix, logger)
            .then((val) => (acquiredLock = val))
            .catch((err) => logger.error(err));
        timeout--;
    }

    if (!acquiredLock) {
        logger.error(
            instanceLogPrefix + " Failed to get lock: " + lockFileName
        );
    } else {
        logger.info(instanceLogPrefix + " Obtained lock: " + lockFileName);
    }

    return acquiredLock;
}

async function tryToGetLock(lockName, instanceLogPrefix, logger) {
    if (existsSync(lockName)) {
        logger.info(
            instanceLogPrefix + " Waiting 1 second for lock: " + lockName
        );
        await new Promise((r) => setTimeout(r, 1000));
        return false;
    } else {
        appendFile(lockName, lockName, function (err) {
            if (err) return err;
        });
        return true;
    }
}

async function releaseLock(lockName, instanceLogPrefix, logger) {
    logger.info(instanceLogPrefix + " Releasing lock: " + lockName);
    await unlink(lockName).catch((err) => logger.error(err));
}

module.exports = { getLock, releaseLock };
