<template>
  <div>mdi-{{mdiIcon}}</div>
</template>

<script>
export default {
  props: {
    iconName: {
      type: String,
      default: () => ''
    },
    isLarge: {
      type: Boolean,
      default: () => false
    }
  },
  computed: {
    mdiIcon: function() {
      const lowerIcon = this.iconName.toLowerCase()
      if (lowerIcon == 'css') {
        return 'language-css3';
      }
      else if (lowerIcon == 'vue') {
        return 'vuejs';
      }
      else if (lowerIcon == 'javascript') {
        return 'language-javascript'
      }
      else if (lowerIcon == 'tex') {
        return 'file'
      }
      else if (lowerIcon == 'shell') {
        return 'bash'
      }
      else if (lowerIcon == 'python') {
        return 'language-python'
      }
      else if (lowerIcon == 'go') {
        return 'language-go'
      }
      else if (lowerIcon == 'solidity') {
        return 'language-solidity'
      }
      else if (lowerIcon == 'typescript') {
        return 'language-typescript'
      }
      return lowerIcon
    }
  }
}
</script>