/* eslint-disable indent */
const { Permissions } = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders');
const subcommandFiles = `${__dirname}/role`;
const { keyv } = require('../index');
const { botAdminIds } = require('../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Manage role membership.')
        .addSubcommand(subcommand =>
            subcommand.setName('add')
                .setDescription('Add a user to a role you are managing.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to add.')
                        .setRequired(true),
                )
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to add user to (must be a manager for this role).')
                        .setRequired(true),
                ))
        .addSubcommand(subcommand =>
            subcommand.setName('rm')
                .setDescription('Remove a user to a role you are managing.')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to remove.')
                        .setRequired(true),
                )
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to remove user from (must be a manager for this role).')
                        .setRequired(true),
                ))
        .addSubcommand(subcommand =>
            subcommand.setName('add_manager')
                .setDescription('Add a manager to a role you are managing.')
                .addUserOption(option =>
                    option.setName('manager')
                        .setDescription('Manager to add.')
                        .setRequired(true),
                )
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to add manager to (must have Manage Roles permission applicable to this role).')
                        .setRequired(true),
                ))
        .addSubcommand(subcommand =>
            subcommand.setName('rm_manager')
                .setDescription('Remove a manager from a role you are managing.')
                .addUserOption(option =>
                    option.setName('manager')
                        .setDescription('Manager to remove.')
                        .setRequired(true),
                )
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to remove manager from (must have Manage Roles permission applicable to this role).')
                        .setRequired(true),
                ))
        .addSubcommand(subcommand =>
            subcommand.setName('add_manager_role')
                .setDescription('Add a manager role to a role you are managing.')
                .addRoleOption(option =>
                    option.setName('manager_role')
                        .setDescription('Manager role to add.')
                        .setRequired(true),
                )
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to add manager role to (must have Manage Roles permission applicable to this role).')
                        .setRequired(true),
                ))
        .addSubcommand(subcommand =>
            subcommand.setName('rm_manager_role')
                .setDescription('Remove a manager role from a role you are managing.')
                .addRoleOption(option =>
                    option.setName('manager_role')
                        .setDescription('Manager role to remove.')
                        .setRequired(true),
                )
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to remove manager role from (must have Manage Roles permission applicable to this role).')
                        .setRequired(true),
                ))
        .addSubcommand(subcommand =>
            subcommand.setName('info')
                .setDescription('View details from a role, like managers and members.')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to view details about.')
                        .setRequired(true),
                ))
        .addSubcommand(subcommand =>
            subcommand.setName('view_all_managers')
                .setDescription('List all managers for every role that has them. Only executable by the Guild/Server Owner.'))
        .addSubcommand(subcommand =>
            subcommand.setName('reset')
                .setDescription('Remove all managers from a role.')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to remove all managers from (must have Manage Roles permission applicable to this role).')
                        .setRequired(true),
                ))
        .addSubcommand(subcommand =>
            subcommand.setName('reset_all')
                .setDescription('Remove all managers from all roles. Only executable by the Guild/Server Owner.')
                .addStringOption(option =>
                    option.setName('confirm')
                        .setDescription('Confirmation of this action.')
                        .setRequired(false),
                )),
    async execute(interaction) {
        await interaction.deferReply();
        await this.executeThis(interaction, undefined);
    },
    async executeThis(interaction, plainRoleId) {
        // check bot hierarchy to satisfy Discord permission restrictions
        if (!interaction.guild.me.permissions.has(Permissions.FLAGS.MANAGE_ROLES)) {
            await interaction.editReply('I do not have any permission to Manage Roles in this server.')
                .catch(console.error);
            return;
        }

        switch (interaction.options.getSubcommand()) {
            case 'reset':
            case 'add_manager':
            case 'rm_manager':
            case 'add_manager_role':
            case 'rm_manager_role':
                if (interaction.options.getRole('role')) {
                    const roleValid = await isValidRoleForManagement(interaction, interaction.options.getRole('role'), false);
                    if (!roleValid) {
                        return;
                    }
                }

                if (interaction.options.getRole('manager_role')) {
                    const roleValid = await isValidRoleForManagement(interaction, interaction.options.getRole('manager_role'), true);
                    if (!roleValid) {
                        return;
                    }
                }

                // check for Manage Roles permissions for role manager commands
                if (!interaction.memberPermissions.has(Permissions.FLAGS.MANAGE_ROLES)) {
                    await interaction.editReply('You do not have any permission to Manage Roles in this server.')
                        .catch(console.error);
                    return;
                }
                break;
            case 'add':
            case 'rm':
                // check if user is manager of the role
                // eslint-disable-next-line no-case-declarations
                const managerCheck = await isManager(interaction, plainRoleId);
                if (!managerCheck) {
                    await interaction.editReply('You are not a manager for this role.')
                        .catch(console.error);
                    return;
                }
                break;
            case 'view_all_managers':
            case 'reset_all':
                if ((interaction.guild.ownerId !== interaction.member.id)
                    && (!(botAdminIds.includes(interaction.member.id)))) {
                        await interaction.editReply('Only executable by the Guild/Server Owner.')
                            .catch(console.error);
                        return;
                }
                break;
        }

        const subcommandExecuter = require(`${subcommandFiles}/${interaction.options.getSubcommand()}.js`);
        if (plainRoleId) {
            await subcommandExecuter.executeThis(interaction, plainRoleId);
        }
        else {
            await subcommandExecuter.execute(interaction);
        }
        return;
    },
};

/**
 * Check if roleSelected is valid for the bot to manage its membership and managers
 * @param {Interaction} interaction
 * @param {Role} roleSelected
 * @param {boolean} isManagerRole
 * @returns if roleSelected is valid for the bot to manage its membership and managers
 */
 async function isValidRoleForManagement(interaction, roleSelected, isManagerRole) {
    if (roleSelected.name === '@everyone') {
        await interaction.editReply('I cannot manage the `@everyone` role.')
            .catch(console.error);
        return false;
    }
    else if (roleSelected.managed) {
        await interaction.editReply('I cannot manage roles managed by integrations like bots.')
            .catch(console.error);
        return false;
    }

    if (interaction.guild.me.roles.highest.comparePositionTo(roleSelected) <= 0) {
        await interaction.editReply(
            'The selected role(s) is/are ranked higher than or equal to your highest role,'
            + ' so I cannot manage the selected role(s). To fix this, try moving the selected role(s) lower than my highest role'
            + ' in the role hierarchy. Read here for more: https://support.discord.com/hc/en-us/articles/214836687-Role-Management-101')
            .catch(console.error);
        return false;
    }

    if (interaction.guild.ownerId !== interaction.member.id
        && !isManagerRole
        && interaction.member.roles.highest.comparePositionTo(roleSelected) <= 0) {
        await interaction.editReply(
            'The selected role(s) is/are ranked higher than or equal to your highest role,'
            + ' so you cannot manage the selected role(s). To fix this, try moving the selected role(s) lower than your highest role'
            + ' in the role hierarchy. Read here for more: https://support.discord.com/hc/en-us/articles/214836687-Role-Management-101')
            .catch(console.error);
        return false;
    }

    return true;
}

async function isManager(interaction, resolvedRole) {
    let roleExamine = resolvedRole;
    if (!roleExamine) {
        roleExamine = interaction.options.getRole('role').id;
    }
    let roleManagers;
    await keyv.get(`role/${interaction.guildId}/${roleExamine}/manager`)
        .then(ret => roleManagers = ret);
    if (!roleManagers) {
        return false;
    }
    if (roleManagers.users.includes(interaction.member.id)) {
        return true;
    }
    const memberRoles = interaction.member.roles.cache;
    for (const managerRoleIdx in roleManagers.roles) {
        if (memberRoles.has(roleManagers.roles[managerRoleIdx])) {
            return true;
        }
    }

    return false;
}
