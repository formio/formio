module.exports = {
    wait: (ms) => {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};

