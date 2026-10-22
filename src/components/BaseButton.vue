<script setup>
// variant: primary | secondary | purple | blue | pink
// Med href renderes et <a>, ellers en <button>.
defineProps({
  variant: { type: String, default: 'primary' },
  href: String
})
</script>

<template>
  <component :is="href ? 'a' : 'button'" :href="href" :class="`button-${variant}`">
    <slot />
  </component>
</template>
