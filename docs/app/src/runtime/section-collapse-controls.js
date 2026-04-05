window.RuntimeSectionCollapseControls = (function () {
  function bindSectionCollapseControls() {
    document.querySelectorAll('.section-hdr.collapsible').forEach((hdr) => {
      const target = document.getElementById(hdr.dataset.target);
      if (!target) return;
      hdr.onclick = () => {
        const open = target.classList.toggle('open');
        hdr.querySelector('.section-toggle')?.classList.toggle('open', open);
      };
    });
  }

  return {
    bindSectionCollapseControls,
  };
})();
