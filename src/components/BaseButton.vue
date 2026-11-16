<script setup>
import { computed } from 'vue'

// variant: primary | secondary | pink | light
// pink og light er farve-varianter af .button-primary (se _buttons.scss),
// så de får automatisk .button-primary med som grundform.
// Med href renderes et <a>, ellers en <button>.
const props = defineProps({
  variant: { type: String, default: 'primary' },
  href: String
})

const farveVarianter = ['pink', 'light']

const klasser = computed(() =>
  farveVarianter.includes(props.variant)
    ? ['button-primary', `button-${props.variant}`]
    : [`button-${props.variant}`]
)
</script>

<template>
  <component :is="href ? 'a' : 'button'" :href="href" :class="klasser">
    <slot />
  </component>
</template>
