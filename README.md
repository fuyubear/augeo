# Augeo

A Discord bot with several unique features to improve server functionality. Mainly for my server's own use for now. Here's a list of features:
- Users without the Manage Roles permission can manage the role membership of certain roles
- The voice accordion: voice channels dynamically display depending on voice channel traffic
- Edit voice channel regions without the Manage Channels permission
- Server leave messages
- Thread persistence in channels that the bot has message read and thread manage permissions
- A role promotion system that can be used without the Manage Roles permission

## Known Issues
- Deleting expansion channels in an active voice channel accordion results in that expansion channel never showing up again. 
- Deleting all base channels in an active voice channel accordion results in the accordion eventually disappearing (sans ignored channels, if any).
- Toggling voice region functionality does not add emoji to existing channels. As a side effect, the voice accordion basically gets stuck in the state prior to the toggling.