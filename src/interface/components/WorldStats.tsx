import React, { Component } from 'react';
import World, { biomeTitles } from '../../simulation/world';
import { Tabs, Tab } from '@blueprintjs/core';


export default class WorldStats extends Component<{ world: World }> {
  state = {
    activeTab: 'settings'
  };

  renderSettingsTab() {
    const { world } = this.props;
    return (
      <table className="detail-table">
        <tbody>
          <tr>
            <td>Size</td>
            <td>{world.size.width}, {world.size.height}</td>
          </tr>
          <tr>
            <td>Sea level</td>
            <td>{world.sealevel}</td>
          </tr>
          <tr>
            <td>Seed</td>
            <td>{world.params.options.seed}</td>
          </tr>
        </tbody>
      </table>
    );
  }

  renderBiomesTab() {
    const { world } = this.props;
    return (
      <table className="detail-table">
        <tbody>
          {Object.entries(world.stats.biomePercents).map(([biome, percent]) => (
            <tr>
              <td>{biomeTitles[biome]}</td>
              <td>{Math.round(percent * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  renderClimateTab() {
    const { world } = this.props;
    return (
      <table className="detail-table">
        <tbody>
          <tr>
            <td>Temperature Range</td>
            <td>{world.stats.ranges.temperature.min} / {world.stats.ranges.temperature.max}</td>
          </tr>
          <tr>
            <td>Height Range</td>
            <td>{world.stats.ranges.height.min} / {world.stats.ranges.height.max}</td>
          </tr>
          <tr>
            <td>Moisture Range</td>
            <td>{world.stats.ranges.moisture.min} / {world.stats.ranges.moisture.max}</td>
          </tr>
        </tbody>
      </table>
    );
  }

  render() {
    return (
      <div className='tn-popover'>
        <Tabs id="world-stats" onChange={tabID => this.setState({ activeTab: tabID })}>
          <Tab id="settings" title="Settings" panel={this.renderSettingsTab()} />
          <Tab id="biomes" title="Biomes" panel={this.renderBiomesTab()} />
          <Tab id="climate" title="Climate" panel={this.renderClimateTab()} />
        </Tabs>
      </div>
    )
  }
}
