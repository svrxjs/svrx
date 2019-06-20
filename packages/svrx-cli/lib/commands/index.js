module.exports = {
    printServeHelp: (list = {}) => {
        Object.keys(list).forEach((name) => {
            const option = list[name];
            if (option.alias) {
                console.log(`   -${option.alias}, --${name}    ${option.description || ''}`);
            } else {
                console.log(`   --${name}    ${option.description || ''}`);
            }
        });
        console.log('\n');
    }
};
