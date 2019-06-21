module.exports = {
    printServeHelp: (list = {}) => {
        Object.keys(list).forEach((name) => {
            const option = list[name];
            if (option.cli !== false) {
                const cmd = option.alias ? `-${option.alias}, --${name}` : `--${name}`;
                if (option.description) {
                    const desc = option.description.replace(/^(\w)/, (a) => a.toUpperCase());
                    const defaultHint = option.defaultHint ? ` (${option.defaultHint})` : '';
                    const hint = defaultHint.replace(/^(\w)/, (a) => a.toLowerCase());

                    const defaults = option.default ? ` (default: ${option.default})` : '';
                    console.log(`     ${cmd.padEnd(22)}${desc}${hint || defaults}`);
                }
            }
        });
        console.log('\n');
    }
};
