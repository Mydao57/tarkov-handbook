import { gql } from "graphql-request";

/**
 * `$lang` is a `LanguageCode` enum value (`en`, `fr`, ...). `gameMode` is pinned
 * to `regular` for v1; lift it to a variable when you add a PvE option.
 */

export const ITEMS_SEARCH_QUERY = gql`
  query ItemsSearch($name: String!, $lang: LanguageCode!) {
    items(name: $name, lang: $lang, gameMode: regular, limit: 25) {
      id
      name
      shortName
      normalizedName
      updated
      avg24hPrice
      lastLowPrice
      low24hPrice
      high24hPrice
      changeLast48hPercent
      basePrice
      wikiLink
      link
      iconLink
      inspectImageLink
      types
      sellFor {
        vendor {
          name
          normalizedName
        }
        price
        currency
        priceRUB
      }
      buyFor {
        vendor {
          name
          normalizedName
        }
        price
        currency
        priceRUB
      }
    }
  }
`;

export const ITEMS_AUTOCOMPLETE_QUERY = gql`
  query ItemsAutocomplete($name: String!, $lang: LanguageCode!) {
    items(name: $name, lang: $lang, gameMode: regular, limit: 25) {
      id
      name
      shortName
    }
  }
`;

export const ALL_AMMO_QUERY = gql`
  query AllAmmo($lang: LanguageCode!) {
    ammo(lang: $lang, gameMode: regular) {
      item {
        id
        name
        shortName
        iconLink
        wikiLink
      }
      caliber
      ammoType
      tracer
      tracerColor
      damage
      armorDamage
      penetrationPower
      penetrationChance
      fragmentationChance
      ricochetChance
      projectileCount
      initialSpeed
      weight
      stackMaxSize
      accuracyModifier
      recoilModifier
      lightBleedModifier
      heavyBleedModifier
    }
  }
`;

export const ALL_TASKS_LIGHT_QUERY = gql`
  query AllTasksLight($lang: LanguageCode!) {
    tasks(lang: $lang, gameMode: regular) {
      id
      name
      normalizedName
      trader {
        name
      }
    }
  }
`;

export const TASK_DETAIL_QUERY = gql`
  query TaskDetail($id: ID!, $lang: LanguageCode!) {
    task(id: $id, lang: $lang, gameMode: regular) {
      id
      name
      normalizedName
      experience
      minPlayerLevel
      kappaRequired
      lightkeeperRequired
      factionName
      wikiLink
      taskImageLink
      trader {
        name
        imageLink
      }
      map {
        name
      }
      taskRequirements {
        task {
          name
        }
        status
      }
      objectives {
        type
        description
        optional
        maps {
          name
        }
        ... on TaskObjectiveItem {
          items {
            name
            shortName
          }
          count
          foundInRaid
        }
        ... on TaskObjectiveShoot {
          targetNames
          count
          shotType
        }
        ... on TaskObjectiveExtract {
          exitStatus
          count
        }
        ... on TaskObjectiveMark {
          markerItem {
            name
            shortName
          }
        }
        ... on TaskObjectiveQuestItem {
          questItem {
            name
          }
          count
        }
        ... on TaskObjectiveBuildItem {
          item {
            name
          }
        }
        ... on TaskObjectivePlayerLevel {
          playerLevel
        }
        ... on TaskObjectiveSkill {
          skillLevel {
            name
            level
          }
        }
        ... on TaskObjectiveTraderLevel {
          trader {
            name
          }
          level
        }
        ... on TaskObjectiveTraderStanding {
          trader {
            name
          }
          value
          compareMethod
        }
      }
      finishRewards {
        offerUnlock {
          trader {
            name
          }
          level
          item {
            name
            shortName
          }
        }
        skillLevelReward {
          name
          level
        }
        traderStanding {
          trader {
            name
          }
          standing
        }
        items {
          item {
            name
            shortName
          }
          count
        }
        traderUnlock {
          name
        }
      }
    }
  }
`;
