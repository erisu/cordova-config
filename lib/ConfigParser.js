/**
    Licensed to the Apache Software Foundation (ASF) under one
    or more contributor license agreements.  See the NOTICE file
    distributed with this work for additional information
    regarding copyright ownership.  The ASF licenses this file
    to you under the Apache License, Version 2.0 (the
    "License"); you may not use this file except in compliance
    with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing,
    software distributed under the License is distributed on an
    "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, either express or implied.  See the License for the
    specific language governing permissions and limitations
    under the License.
*/

// const et = require('elementtree');
// const { parseElementtreeSync } = require('../util/xml-helpers');
const { XMLParser, XMLBuilder, XMLValidator} = require("fast-xml-parser");
// const CordovaError = require('../CordovaError');
const fs = require('fs-extra');
const { existsSync } = require('fs-extra');
// const events = require('../events');

const CDV_XMLNS_URI = 'http://cordova.apache.org/ns/1.0';

/** Wraps a config.xml file */
class ConfigParser {
  /**
   * @param {String} #path - path of the xml file that will be parsed.
   */
    #path;

    /**
     * @param {String} #rawXml - the raw xml content of the xml file. (un-edited)
     */
    #rawXml;

    /**
     * @param {Object} #rawDoc - the parsed xml document.
     */
    #rawDoc;

    /**
     * @param {Object} #doc - the parsed xml document.
     */
    #doc;

    /**
     * @param {String} #platform - the parsed xml document.
     */
    #platform;

    /**
     * @param {Object} #platformData - the parsed xml document.
     */
    #platformData;

    /**
     * @param {Object} #preferences - the parsed xml document.
     */
    #preferences

    constructor (platform, path) {
      // Ensure that platform is defined.
      // Not all config.xml files might have platform related tags.
      // E.g. config.xml file within the platform dir. It is already been flattened,
      // but the prepare and build scripts is still platform driven.
      if (!platform) {
        throw new Error(`Platform must be provided.`);
      }

      // Check if the path exists
      if (!existsSync(path)) {
          throw new Error(`The provided path "${path}" does not exist.`);
      }

      // Store some private data
      this.#platform = platform;
      this.#path = path;
      this.#rawXml = fs.readFileSync(this.#path);

      // Create the parser
      const parserOptions = {
          ignoreAttributes : false,
          attributeNamePrefix : "@_",
          alwaysCreateTextNode: true
      };
      const parser = new XMLParser(parserOptions);

      // parse the raw xml data to json.
      this.#rawDoc = parser.parse(this.#rawXml);

      // Valid config.xml requires widget as root node.
      if (!this.#rawDoc.widget) {
          throw new Error(`${path} has an incorrect root node. Expecting "widget"`);
      }

      // Valid Cordova's config.xml requires the cdv xml namespace.
      const xmlnsCdv = this.#rawDoc.widget['@_xmlns:cdv'];
      if (!xmlnsCdv && xmlnsCdv !== CDV_XMLNS_URI) {
          throw new Error(`The provided document does not include the proper xml namespace for xmlns:cdv. Expecting "${CDV_XMLNS_URI}".`);
      }

      // grab only the platform specific data.
      this.#platformData = this.#rawDoc.widget.platform
          ? this.#rawDoc.widget.platform.filter(i => i['@_name'] === this.#platform).pop()
          : {};

      this.#platformData = JSON.parse(JSON.stringify(this.#platformData));
      this.#doc = JSON.parse(JSON.stringify(this.#rawDoc));

      // Update preference value if exisiting else add new.
      for (const platformPref of this.#platformData.preference) {
        const foundPref = this.#doc.widget.preference.find(pref => pref['@_name'] === platformPref['@_name']);

        if (foundPref) {
          foundPref['@_value'] = platformPref['@_value'];
        } else {
          // Maybe add verbose?
          this.#doc.widget.preference.push(platformPref);
        }
      }

      // platform name is not needed.
      delete this.#platformData['@_name'];
      // remove all other platform preference data as it was flattened.
      delete this.#platformData.preference;
      // remove the platform data that was flattened
      delete this.#doc.widget.platform;

      this.#doc = module.exports.deepMerge(this.#doc, { widget: { ...this.#platformData } });

      console.log(this.#doc);
      console.log(this.#platformData);

      // console.log(this.#rawDoc);
      // console.log(this.#doc);
      // console.log(this.#doc.widget.preference);

      const builderOptions = {
          processEntities:false,
          format: true,
          ignoreAttributes: false,
      };
      const builder = new XMLBuilder(builderOptions);
      let xmlDataStr = builder.build(this.#doc);
      fs.writeFileSync('./platform.config.xml', xmlDataStr, 'utf8');
    }

    #setPreferences () {
      const unformatedData = this.#doc.widget.preference;
      this.#preferences = this.#preferences ?? {};

      Object.values(unformatedData).forEach(pref => {
        this.#preferences[pref['@_name']] = pref['@_value'];
      });

      return this;
    }

    getPreferences () {
        if (!this.#preferences) {
          this.#setPreferences()
        }

        return this.#preferences;
    }

    getPreference (key) {
        if (!this.#preferences) {
          this.#setPreferences()
        }

        return this.#preferences[key];
    }

    // getAttribute (attr) {
    //     return this.doc.getroot().attrib[attr];
    // }

    // packageName () {
    //     return this.getAttribute('id');
    // }

    // setPackageName (id) {
    //     this.doc.getroot().attrib.id = id;
    // }

    // name () {
    //     return getNodeTextSafe(this.doc.find('name'));
    // }

    // setName (name) {
    //     findOrCreate(this.doc, 'name').text = name;
    // }

    // shortName () {
    //     return this.doc.find('name').attrib.short || this.name();
    // }

    // setShortName (shortname) {
    //     const el = findOrCreate(this.doc, 'name');
    //     if (!el.text) el.text = shortname;
    //     el.attrib.short = shortname;
    // }

    // description () {
    //     return getNodeTextSafe(this.doc.find('description'));
    // }

    // setDescription (text) {
    //     findOrCreate(this.doc, 'description').text = text;
    // }

    // version () {
    //     return this.getAttribute('version');
    // }

    // setVersion (value) {
    //     this.doc.getroot().attrib.version = value;
    // }

    // author () {
    //     return getNodeTextSafe(this.doc.find('author'));
    // }

    // getGlobalPreference (name) {
    //     return this._getPrefElem(name).attrib.value;
    // }

    // setGlobalPreference (name, value) {
    //     this._getPrefElem(name, { create: true }).attrib.value = value;
    // }

    // getPlatformPreference (name, platform) {
    //     return this._getPrefElem(name, { platform }).attrib.value;
    // }

    // setPlatformPreference (name, platform, value) {
    //     this._getPrefElem(name, { platform, create: true }).attrib.value = value;
    // }

    // getPreference (name, platform) {
    //     return (platform && this.getPlatformPreference(name, platform)) ||
    //         this.getGlobalPreference(name);
    // }

    // setPreference (name, platform, value) {
    //     if (!value) {
    //         value = platform;
    //         platform = undefined;
    //     }

    //     this._getPrefElem(name, { platform, create: true }).attrib.value = value;
    // }

    // /**
    //  * Finds the element that determines the value of preference `name` within `parent`.
    //  *
    //  * @param {String} name preference name to search for (case insensitive)
    //  * @param {{create?: boolean, platform?: string}} [opts]
    //  * @return {et.Element} the last matching preference in `parent` (possibly created)
    //  */
    // _getPrefElem (name, { create = false, platform } = {}) {
    //     const parent = platform
    //         ? this.doc.findall(`./platform[@name="${platform}"]`).pop()
    //         : this.doc.getroot();

    //     const makeElem = create ? et.SubElement.bind(null, parent) : et.Element;
    //     const getFallBackElem = () => makeElem('preference', { name, value: '' });

    //     if (!parent) {
    //         if (create) {
    //             throw new CordovaError(`platform does not exist (received platform: ${platform})`);
    //         }
    //         return getFallBackElem();
    //     }

    //     return parent.findall('preference')
    //         .filter(elem => elem.attrib.name.toLowerCase() === name.toLowerCase())
    //         .pop() || getFallBackElem();
    // }

    // /**
    //  * Returns all resources for the platform specified.
    //  *
    //  * @param {string} platform     The platform.
    //  * @param {string} resourceName Type of static resources to return.
    //  *                              "icon" and "splash" currently supported.
    //  * @return {ImageResources}     Resources for the platform specified.
    //  */
    // getStaticResources (platform, resourceName) {
    //     const normalizedAttrs = ({ attrib }) => ({
    //         density: attrib[`${this.cdvNamespacePrefix}:density`] ||
    //             attrib['gap:density'],
    //         ...attrib
    //     });

    //     // platform specific icons
    //     const platformResources = platform
    //         ? this.doc.findall(`./platform[@name="${platform}"]/${resourceName}`)
    //             .map(elt => new ImageResource(normalizedAttrs(elt), { platform }))
    //         : [];

    //     // root level resources
    //     const commonResources = this.doc.findall(resourceName)
    //         .map(elt => new ImageResource(normalizedAttrs(elt)));

    //     return ImageResources.create(...platformResources, ...commonResources);
    // }

    // /**
    //  * Returns all icons for specific platform.
    //  *
    //  * @param  {string} platform Platform name
    //  * @return {ImageResources}  Array of icon objects.
    //  */
    // getIcons (platform) {
    //     return this.getStaticResources(platform, 'icon');
    // }

    // /**
    //  * Returns all splash images for specific platform.
    //  *
    //  * @param  {string} platform Platform name
    //  * @return {ImageResources}  Array of Splash objects.
    //  */
    // getSplashScreens (platform) {
    //     return this.getStaticResources(platform, 'splash');
    // }

    // /**
    //  * Returns all resource-files for a specific platform.
    //  *
    //  * @param  {string} platform Platform name
    //  * @param  {boolean} includeGlobal Whether to return resource-files at the
    //  *                                 root level.
    //  * @return {FileResource[]}      Array of resource file objects.
    //  */
    // getFileResources (platform, includeGlobal) {
    //     const platformResources = platform
    //         ? this.doc.findall(`./platform[@name="${platform}"]/resource-file`)
    //         : [];

    //     const globalResources = includeGlobal
    //         ? this.doc.findall('resource-file')
    //         : [];

    //     return [].concat(platformResources, globalResources)
    //         .map(({ attrib }) => new FileResource(attrib, { platform }));
    // }

    // /**
    //  * Returns all hook scripts for the hook type specified.
    //  *
    //  * @param  {String} hook     The hook type.
    //  * @param {Array}  platforms Platforms to look for scripts into (root scripts will be included as well).
    //  * @return {Array}               Script elements.
    //  */
    // getHookScripts (hook, platforms = []) {
    //     return this.doc.findall('./hook')
    //         .concat(...platforms.map(platform =>
    //             this.doc.findall(`./platform[@name="${platform}"]/hook`)
    //         ))
    //         .filter(({ attrib: { src, type } }) =>
    //             src && type && type.toLowerCase() === hook
    //         );
    // }

    // /**
    // * Returns a list of plugin (IDs).
    // *
    // * This function also returns any plugin's that
    // * were defined using the legacy <feature> tags.
    // *
    // * @return {string[]} Array of plugin IDs
    // */
    // getPluginIdList () {
    //     const plugins = this.doc.findall('plugin');
    //     const result = plugins.map(plugin => plugin.attrib.name);
    //     const features = this.doc.findall('feature');

    //     features.forEach(element => {
    //         const idTag = element.find('./param[@name="id"]');
    //         if (idTag) result.push(idTag.attrib.value);
    //     });

    //     return result;
    // }

    // getPlugins () {
    //     return this.getPluginIdList().map(pluginId => this.getPlugin(pluginId));
    // }

    // /**
    //  * Adds a plugin element. Does not check for duplicates.
    //  *
    //  * @param {object} attributes name and spec are supported
    //  * @param {Array|object} variables name, value or arbitary object
    //  */
    // addPlugin (attributes, variables) {
    //     if (!attributes && !attributes.name) return;

    //     // support arbitrary object as variables source
    //     variables = variables || [];
    //     if (typeof variables === 'object' && !Array.isArray(variables)) {
    //         variables = Object.entries(variables)
    //             .map(([name, value]) => ({ name, value }));
    //     }

    //     const el = et.SubElement(this.doc.getroot(), 'plugin', attributes);

    //     variables.forEach(({ name, value }) => {
    //         et.SubElement(el, 'variable', { name, value });
    //     });
    // }

    // /**
    //  * Retrives the plugin with the given id or null if not found.
    //  *
    //  * This function also returns any plugin's that
    //  * were defined using the legacy <feature> tags.
    //  *
    //  * @param {String} id
    //  * @returns {object} plugin including any variables
    //  */
    // getPlugin (id) {
    //     if (!id) return undefined;

    //     const pluginElement = this.doc.find(`./plugin/[@name="${id}"]`);

    //     if (pluginElement === null) {
    //         const legacyFeature = this.doc.find(`./feature/param[@name="id"][@value="${id}"]/..`);

    //         if (legacyFeature) {
    //             events.emit('log', `Found deprecated feature entry for ${id} in config.xml.`);
    //             return featureToPlugin(legacyFeature);
    //         }

    //         return undefined;
    //     }

    //     const { name, spec, src, version } = pluginElement.attrib;

    //     const varFragments = pluginElement.findall('variable')
    //         .map(({ attrib: { name, value } }) =>
    //             name ? { [name]: value } : null
    //         );
    //     const variables = Object.assign({}, ...varFragments);

    //     return { name, spec: spec || src || version, variables };
    // }

    // /**
    //  * Remove the plugin entry with give name (id).
    //  *
    //  * This function also operates on any plugin's that
    //  * were defined using the legacy <feature> tags.
    //  *
    //  * @param {string} id name of the plugin
    //  */
    // removePlugin (id) {
    //     if (!id) return;

    //     const root = this.doc.getroot();
    //     removeChildren(root, `./plugin/[@name="${id}"]`);
    //     removeChildren(root, `./feature/param[@name="id"][@value="${id}"]/..`);
    // }

    // // Add any element to the root
    // addElement (name, attributes) {
    //     et.SubElement(this.doc.getroot(), name, attributes);
    // }

    // /**
    //  * Adds an engine. Does not check for duplicates.
    //  *
    //  * @param  {String} name the engine name
    //  * @param  {String} [spec] engine source location or version
    //  */
    // addEngine (name, spec) {
    //     if (!name) return;

    //     const attrs = Object.assign({ name }, spec ? { spec } : null);
    //     et.SubElement(this.doc.getroot(), 'engine', attrs);
    // }

    // /**
    //  * Removes all the engines with given name
    //  *
    //  * @param  {String} name the engine name.
    //  */
    // removeEngine (name) {
    //     removeChildren(this.doc.getroot(), `./engine/[@name="${name}"]`);
    // }

    // getEngines () {
    //     return this.doc.findall('./engine').map(engine => ({
    //         name: engine.attrib.name,
    //         spec: engine.attrib.spec || engine.attrib.version || null
    //     }));
    // }

    // /**
    //  * @typedef {Object} CommonRuleOptions
    //  * @prop {string} [minimum_tls_version]
    //  * @prop {StringifiedBool} [requires_forward_secrecy]
    //  * @prop {StringifiedBool} [requires_certificate_transparency]
    //  *
    //  * @typedef {string} StringifiedBool has either the value 'true' or 'false'
    //  */

    // /**
    //  * Get all the access tags
    //  *
    //  * @returns {AccessRule[]}
    //  *
    //  * @typedef {CommonRuleOptions} AccessRule
    //  * @prop {string} origin
    //  * @prop {StringifiedBool} [allows_arbitrary_loads_in_web_content]
    //  * @prop {StringifiedBool} [allows_arbitrary_loads_in_media] (DEPRECATED)
    //  * @prop {StringifiedBool} [allows_arbitrary_loads_for_media]
    //  * @prop {StringifiedBool} [allows_local_networking]
    //  */
    // getAccesses () {
    //     return this.doc.findall('./access').map(element => ({
    //         origin: element.attrib.origin,
    //         minimum_tls_version: element.get('minimum-tls-version'),
    //         requires_forward_secrecy: element.get('requires-forward-secrecy'),
    //         requires_certificate_transparency: element.get('requires-certificate-transparency'),
    //         allows_arbitrary_loads_in_web_content: element.get('allows-arbitrary-loads-in-web-content'),
    //         allows_arbitrary_loads_in_media: element.get('allows-arbitrary-loads-in-media'),
    //         allows_arbitrary_loads_for_media: element.get('allows-arbitrary-loads-for-media'),
    //         allows_local_networking: element.get('allows-local-networking')
    //     }));
    // }

    // /**
    //  * Get all the allow-navigation tags
    //  *
    //  * @returns {AllowNavigationRule[]}
    //  * @typedef {{href: string} & CommonRuleOptions} AllowNavigationRule
    //  */
    // getAllowNavigations () {
    //     return this.doc.findall('./allow-navigation').map(element => ({
    //         href: element.attrib.href,
    //         minimum_tls_version: element.get('minimum-tls-version'),
    //         requires_forward_secrecy: element.get('requires-forward-secrecy'),
    //         requires_certificate_transparency: element.get('requires-certificate-transparency')
    //     }));
    // }

    // /**
    //  * Get all the allow-intent tags
    //  *
    //  * @returns {{href: string}[]}
    //  */
    // getAllowIntents () {
    //     return this.doc.findall('./allow-intent').map(element => ({
    //         href: element.attrib.href
    //     }));
    // }

    // /** Get all edit-config tags */
    // getEditConfigs (platform) {
    //     const platform_edit_configs = this.doc.findall(`./platform[@name="${platform}"]/edit-config`);
    //     const edit_configs = this.doc.findall('edit-config').concat(platform_edit_configs);

    //     return edit_configs.map(tag => ({
    //         file: tag.attrib.file,
    //         target: tag.attrib.target,
    //         mode: tag.attrib.mode,
    //         id: 'config.xml',
    //         xmls: tag.getchildren()
    //     }));
    // }

    // /** Get all config-file tags */
    // getConfigFiles (platform) {
    //     const platform_config_files = this.doc.findall(`./platform[@name="${platform}"]/config-file`);
    //     const config_files = this.doc.findall('config-file').concat(platform_config_files);

    //     return config_files.map(tag => ({
    //         target: tag.attrib.target,
    //         parent: tag.attrib.parent,
    //         after: tag.attrib.after,
    //         xmls: tag.getchildren(),
    //         // To support demuxing via versions
    //         versions: tag.attrib.versions,
    //         deviceTarget: tag.attrib['device-target']
    //     }));
    // }

    // write () {
    //     fs.writeFileSync(this.path, this.doc.write({ indent: 4 }), 'utf-8');
    // }
}

// function getNodeTextSafe (el) {
//     return el && el.text && el.text.trim();
// }

// function findOrCreate (doc, name) {
//     const parent = doc.getroot();
//     return parent.find(name) || new et.SubElement(parent, name);
// }

// function getCordovaNamespacePrefix (doc) {
//     const attrs = doc.getroot().attrib;
//     const nsAttr = Object.keys(attrs).find(key =>
//         key.startsWith('xmlns:') && attrs[key] === CDV_XMLNS_URI
//     );

//     return nsAttr ? nsAttr.split(':')[1] : 'cdv';
// }

// // remove child from element for each match
// function removeChildren (el, selector) {
//     el.findall(selector).forEach(child => el.remove(child));
// }

// function featureToPlugin (featureElement) {
//     const plugin = {};
//     plugin.variables = [];
//     let pluginVersion, pluginSrc;

//     const nodes = featureElement.findall('param');
//     nodes.forEach(element => {
//         const n = element.attrib.name;
//         const v = element.attrib.value;

//         if (n === 'id') {
//             plugin.name = v;
//         } else if (n === 'version') {
//             pluginVersion = v;
//         } else if (n === 'url' || n === 'installPath') {
//             pluginSrc = v;
//         } else {
//             plugin.variables[n] = v;
//         }
//     });

//     const spec = pluginSrc || pluginVersion;
//     if (spec) {
//         plugin.spec = spec;
//     }

//     return plugin;
// }

// /**
//  * The attribute target is only used for the Windows & Electron platforms
//  */
// class BaseResource {
//     constructor (attrs, { platform = null } = {}) {
//         // null means resource is shared between platforms
//         this.platform = platform || null;
//         this.src = attrs.src;
//         this.target = attrs.target || undefined;
//     }
// }

// /**
//  * The attributes density, background, and foreground are only used for the
//  * Android platform
//  */
// class ImageResource extends BaseResource {
//     constructor (attrs, opts) {
//         super(attrs, opts);
//         this.density = attrs.density;
//         this.width = Number(attrs.width) || undefined;
//         this.height = Number(attrs.height) || undefined;
//         this.background = attrs.background || undefined;
//         this.foreground = attrs.foreground || undefined;
//         this.monochrome = attrs.monochrome || undefined;
//     }
// }

// class FileResource extends BaseResource {
//     constructor (attrs, opts) {
//         super(attrs, opts);
//         this.versions = attrs.versions;
//         this.deviceTarget = attrs['device-target'];
//         this.arch = attrs.arch;
//     }
// }

// class ImageResources extends Array {
//     /**
//      * Creates an ImageResources instance with defaultResource property.
//      *
//      * It is easy to break native Array methods like `map` when carelessly
//      * overriding the array constructor, so it's safer to use this factory
//      * function for our needs instead.
//      *
//      * @param {...ImageResource} args - The entries of this array
//      * @return {ImageResources} An ImageResources instance with args as entries
//      */
//     static create (...args) {
//         const defaultResource = args.filter(res =>
//             !res.width && !res.height && !res.density
//         ).pop();

//         return Object.assign(new ImageResources(...args), { defaultResource });
//     }

//     /**
//      * Returns resource with specified width and/or height.
//      * @param  {number} width Width of resource.
//      * @param  {number} height Height of resource.
//      * @return {ImageResource} Resource object or null if not found.
//      */
//     getBySize (width, height) {
//         return this.find(res =>
//             (res.width || res.height) &&
//             (!res.width || (width === res.width)) &&
//             (!res.height || (height === res.height))
//         ) || null;
//     }

//     /**
//      * Returns resource with specified density.
//      *
//      * Only used by Android platform.
//      *
//      * @param  {string} density Density of resource.
//      * @return {ImageResource} Resource object or null if not found.
//      */
//     getByDensity (density) {
//         return this.find(res => res.density === density) || null;
//     }

//     /**
//      * Returns the default icon
//      * @return {ImageResource} Resource object or null if not found.
//      */
//     getDefault () {
//         return this.defaultResource;
//     }
// }

module.exports = ConfigParser;


module.exports.deepMerge = (mergeTo, mergeWith) => {
  for (const property in mergeWith) {
      if ((property === '__proto__' || property === 'constructor' || property === 'prototype')) {
          continue;
      }

      if (Object.prototype.toString.call(mergeWith[property]) === '[object Object]') {
          mergeTo[property] = module.exports.deepMerge((mergeTo[property] || {}), mergeWith[property]);
      } else if (Object.prototype.toString.call(mergeWith[property]) === '[object Array]') {
          mergeTo[property] = [].concat((mergeTo[property] || []), mergeWith[property]);
      } else {
          mergeTo[property] = mergeWith[property];
      }
  }

  return mergeTo;
};
