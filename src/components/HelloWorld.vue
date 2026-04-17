<template>
  <div class="container">
     <h1>当前计数：{{ count }}</h1>
     <h1>当前两倍计数：{{ doubleCount }}</h1>
     <button @click="handleClick">增加</button>
  </div>
</template>
<script setup lang="ts">
import {useCounterStore} from '@/stores/counter'
import { storeToRefs } from 'pinia';
const countStore = useCounterStore()
const {count,doubleCount}=storeToRefs(countStore)
const handleClick = () => {
  countStore.increment()
}
</script>
<style scoped>
.container{
  text-align: center;
}
</style>
