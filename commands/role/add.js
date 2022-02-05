module.exports = {
    async execute(interaction) {
        await this.executeThis(interaction, undefined);
        return;
    },
    async executeThis(interaction, plainRoleId) {
        // add user to role
        let roleId;
        let roleName;
        if (!plainRoleId) {
            roleId = interaction.options.getRole('role').id;
            roleName = interaction.options.getRole('role').name;
        }
        else {
            roleId = plainRoleId;
            let role;
            await interaction.guild.roles.fetch(plainRoleId).then(ret => role = ret);
            roleName = role.name;
        }

        await interaction.options.getMember('user').roles.add(roleId)
            .catch(console.error);

        await interaction.editReply(`Successfully added ${interaction.options.getMember('user').displayName} to ${roleName}`)
            .catch(console.error);
        return;
    },
};